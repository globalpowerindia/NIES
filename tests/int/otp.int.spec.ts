import { sql } from 'drizzle-orm'
import { getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { checkChallenge, issueChallenge, OTP_MAX_ATTEMPTS } from '@/lib/otp/challenges'
import config from '@/payload.config'

/**
 * A 6-digit code is only as strong as the limits around it. These assert the
 * limits: one use, a capped number of guesses, an expiry, one live code at a
 * time, and a throttle on sending.
 */

let payload: Payload
const destinations = new Set<string>()

const newPhone = () => {
  const phone = `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
  destinations.add(phone)
  return phone
}
const ip = () => `203.0.113.${Math.floor(Math.random() * 250)}`

const issue = async (destination: string) => {
  const result = await issueChallenge(payload, { channel: 'SMS', destination, ip: ip() })
  if (!result.ok) throw new Error('expected a code to be issued')
  return result.code
}
const check = (destination: string, code: string) => checkChallenge(payload, { channel: 'SMS', destination, code })
const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0')

/** Pretends the last send was long ago, so a test can ask again without waiting a minute. */
const ageChallenges = async (destination: string, ms: number) => {
  // Straight SQL: Payload treats createdAt as its own to set.
  const db = (payload.db as unknown as { drizzle: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> } }).drizzle
  await db.execute(sql`
    UPDATE "otp_challenges" SET "created_at" = "created_at" - make_interval(secs => ${ms / 1000})
    WHERE "destination" = ${destination}
  `)
}

describe('OTP challenges', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(async () => {
    for (const destination of destinations) {
      await payload.delete({ collection: 'otp-challenges', where: { destination: { equals: destination } }, overrideAccess: true })
    }
    destinations.clear()
  })

  it('accepts the right code once, and never again', async () => {
    const phone = newPhone()
    const code = await issue(phone)

    expect(await check(phone, code)).toEqual({ ok: true })
    expect((await check(phone, code)).ok).toBe(false)
  })

  it('never stores the code itself', async () => {
    const phone = newPhone()
    const code = await issue(phone)
    const { docs } = await payload.find({ collection: 'otp-challenges', where: { destination: { equals: phone } }, overrideAccess: true })

    expect(docs[0].codeHash).not.toContain(code)
    expect(JSON.stringify(docs[0])).not.toContain(`"${code}"`)
  })

  it('counts down wrong guesses, then refuses even the right code', async () => {
    const phone = newPhone()
    const code = await issue(phone)

    for (let tries = 1; tries < OTP_MAX_ATTEMPTS; tries++) {
      expect(await check(phone, wrong(code))).toEqual({ ok: false, reason: 'WRONG_CODE', attemptsLeft: OTP_MAX_ATTEMPTS - tries })
    }
    expect(await check(phone, wrong(code))).toEqual({ ok: false, reason: 'TOO_MANY_ATTEMPTS' })
    expect(await check(phone, code)).toEqual({ ok: false, reason: 'TOO_MANY_ATTEMPTS' })
  })

  it('does not let a burst of simultaneous guesses exceed the cap', async () => {
    const phone = newPhone()
    const code = await issue(phone)

    const results = await Promise.all(Array.from({ length: 15 }, () => check(phone, wrong(code))))
    const counted = results.filter((r) => !r.ok && r.reason === 'WRONG_CODE').length

    expect(counted).toBeLessThan(OTP_MAX_ATTEMPTS)
    expect(await check(phone, code)).toEqual({ ok: false, reason: 'TOO_MANY_ATTEMPTS' })
  })

  it('rejects an expired code', async () => {
    const phone = newPhone()
    const code = await issue(phone)
    await payload.update({
      collection: 'otp-challenges',
      where: { destination: { equals: phone } },
      data: { expiresAt: new Date(Date.now() - 1000).toISOString() },
      overrideAccess: true,
    })

    expect(await check(phone, code)).toEqual({ ok: false, reason: 'EXPIRED' })
  })

  it('makes the user wait a minute between codes', async () => {
    const phone = newPhone()
    await issue(phone)
    const again = await issueChallenge(payload, { channel: 'SMS', destination: phone, ip: ip() })

    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.retryAfterSeconds).toBeGreaterThan(50)
  })

  it('sends one code, not ten, when ten requests arrive at once', async () => {
    const phone = newPhone()
    const results = await Promise.all(
      Array.from({ length: 10 }, () => issueChallenge(payload, { channel: 'SMS', destination: phone, ip: ip() })),
    )
    const { docs } = await payload.find({
      collection: 'otp-challenges',
      where: { and: [{ destination: { equals: phone } }, { consumedAt: { exists: false } }] },
      overrideAccess: true,
    })

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(docs).toHaveLength(1)
  })

  it('retires the old code when a new one is sent', async () => {
    const phone = newPhone()
    const first = await issue(phone)
    await ageChallenges(phone, 61_000)
    const second = await issue(phone)

    if (first !== second) expect((await check(phone, first)).ok).toBe(false)
    expect(await check(phone, second)).toEqual({ ok: true })
  })

  it('caps sends per number per hour', async () => {
    const phone = newPhone()
    for (let i = 0; i < 5; i++) {
      await issue(phone)
      await ageChallenges(phone, 61_000)
    }
    const sixth = await issueChallenge(payload, { channel: 'SMS', destination: phone, ip: ip() })
    expect(sixth.ok).toBe(false)
  })
})
