import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'

import type { OtpChannel } from '@/collections/OtpChallenges'
import { env } from '@/lib/env'

/**
 * Issuing and checking one-time codes, for both SMS and email.
 *
 * A 6-digit code is only safe because guessing is capped: 5 tries per code,
 * 5 minutes to use it, and a new code kills the old one. The send limits
 * matter as much — every SMS costs money, and "SMS pumping" bots request
 * thousands to premium numbers to farm the fees.
 */

export const OTP_LENGTH = 6
export const OTP_TTL_MS = 5 * 60_000
export const OTP_MAX_ATTEMPTS = 5
export const RESEND_AFTER_MS = 60_000
const PER_DESTINATION_PER_HOUR = 5
const PER_IP_PER_HOUR = 20
const HOUR_MS = 60 * 60_000

const key = `${env.PAYLOAD_SECRET}:otp`

/**
 * Keyed with the server secret and bound to where the code was sent, so a
 * leaked table cannot be brute-forced offline (a million codes is nothing
 * without the key) and a hash cannot be replayed for another number.
 */
const hashCode = (channel: OtpChannel, destination: string, code: string): string =>
  createHmac('sha256', key).update(`${channel}:${destination}:${code}`).digest('hex')

export const hashIp = (ip: string): string => createHmac('sha256', key).update(`ip:${ip}`).digest('hex')

export type IssueResult =
  | { ok: true; code: string; resendAfterSeconds: number }
  | { ok: false; retryAfterSeconds: number }

/**
 * Creates a challenge and returns the code to send, or how long to wait.
 * The code leaves this function exactly once, to go into the SMS or email.
 */
export const issueChallenge = async (
  payload: Payload,
  { channel, destination, ip }: { channel: OtpChannel; destination: string; ip: string },
): Promise<IssueResult> => {
  const now = Date.now()
  const ipHash = hashIp(ip)
  const hourAgo = new Date(now - HOUR_MS).toISOString()

  const { docs: recent } = await payload.find({
    collection: 'otp-challenges',
    where: {
      and: [
        { channel: { equals: channel } },
        { destination: { equals: destination } },
        { createdAt: { greater_than: hourAgo } },
      ],
    },
    sort: '-createdAt',
    limit: PER_DESTINATION_PER_HOUR,
    overrideAccess: true,
  })

  const waitFor = (sinceIso: string, windowMs: number) =>
    Math.ceil((new Date(sinceIso).getTime() + windowMs - now) / 1000)

  if (recent[0]) {
    const wait = waitFor(recent[0].createdAt, RESEND_AFTER_MS)
    if (wait > 0) return { ok: false, retryAfterSeconds: wait }
  }
  if (recent.length >= PER_DESTINATION_PER_HOUR) {
    return { ok: false, retryAfterSeconds: waitFor(recent[recent.length - 1].createdAt, HOUR_MS) }
  }

  const { totalDocs: fromThisIp } = await payload.count({
    collection: 'otp-challenges',
    where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: hourAgo } }] },
    overrideAccess: true,
  })
  if (fromThisIp >= PER_IP_PER_HOUR) return { ok: false, retryAfterSeconds: 15 * 60 }

  // Asking again retires the previous code: only the newest one works.
  await payload.update({
    collection: 'otp-challenges',
    where: {
      and: [
        { channel: { equals: channel } },
        { destination: { equals: destination } },
        { consumedAt: { exists: false } },
      ],
    },
    data: { consumedAt: new Date(now).toISOString() },
    overrideAccess: true,
  })

  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')
  await payload.create({
    collection: 'otp-challenges',
    data: {
      channel,
      destination,
      codeHash: hashCode(channel, destination, code),
      attempts: 0,
      expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      ipHash,
    },
    overrideAccess: true,
  })

  return { ok: true, code, resendAfterSeconds: RESEND_AFTER_MS / 1000 }
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'NO_CODE' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' }
  | { ok: false; reason: 'WRONG_CODE'; attemptsLeft: number }

type Drizzle = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }

/**
 * Checks a code and, if right, spends it.
 *
 * Both steps are single conditional UPDATEs rather than read-then-write, so
 * firing many guesses at once cannot slip past the attempt cap, and two
 * requests carrying the right code cannot both sign in.
 */
export const checkChallenge = async (
  payload: Payload,
  { channel, destination, code }: { channel: OtpChannel; destination: string; code: string },
): Promise<CheckResult> => {
  const { docs } = await payload.find({
    collection: 'otp-challenges',
    where: {
      and: [
        { channel: { equals: channel } },
        { destination: { equals: destination } },
        { consumedAt: { exists: false } },
      ],
    },
    sort: '-createdAt',
    limit: 1,
    overrideAccess: true,
  })
  const challenge = docs[0]
  if (!challenge) return { ok: false, reason: 'NO_CODE' }
  if (new Date(challenge.expiresAt).getTime() <= Date.now()) return { ok: false, reason: 'EXPIRED' }

  const db = (payload.db as unknown as { drizzle: Drizzle }).drizzle

  // Spend an attempt first; the right code costs one too.
  const counted = await db.execute(sql`
    UPDATE "otp_challenges" SET "attempts" = "attempts" + 1, "updated_at" = now()
    WHERE "id" = ${challenge.id} AND "attempts" < ${OTP_MAX_ATTEMPTS} AND "consumed_at" IS NULL
    RETURNING "attempts"
  `)
  const attempts = counted.rows[0] ? Number(counted.rows[0].attempts) : null
  if (attempts === null) return { ok: false, reason: 'TOO_MANY_ATTEMPTS' }

  const expected = Buffer.from(challenge.codeHash, 'hex')
  const offered = Buffer.from(hashCode(channel, destination, code), 'hex')
  if (expected.length !== offered.length || !timingSafeEqual(expected, offered)) {
    const attemptsLeft = OTP_MAX_ATTEMPTS - attempts
    return attemptsLeft > 0 ? { ok: false, reason: 'WRONG_CODE', attemptsLeft } : { ok: false, reason: 'TOO_MANY_ATTEMPTS' }
  }

  const spent = await db.execute(sql`
    UPDATE "otp_challenges" SET "consumed_at" = now(), "updated_at" = now()
    WHERE "id" = ${challenge.id} AND "consumed_at" IS NULL
    RETURNING "id"
  `)
  return spent.rows.length ? { ok: true } : { ok: false, reason: 'NO_CODE' }
}
