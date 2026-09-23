import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import type { Payload } from 'payload'

import type { AuthTokenPurpose } from '@/collections/AuthTokens'
import type { Customer } from '@/payload-types'

/**
 * Issuing and redeeming the one-shot links. The token is returned to the
 * caller exactly once, to be put in an email; only its hash is ever stored.
 */

const TTL_MINUTES: Record<AuthTokenPurpose, number> = {
  // Long enough to survive a slow inbox, short enough that a forwarded
  // welcome email is not a standing key to the account.
  EMAIL_VERIFY: 60 * 24,
  // Deliberately short: a reset link is the strongest credential there is.
  PASSWORD_RESET: 30,
}

const hash = (token: string): string => createHash('sha256').update(token).digest('hex')

export const issueToken = async (
  payload: Payload,
  purpose: AuthTokenPurpose,
  customer: Customer,
  email: string,
): Promise<string> => {
  // 32 bytes of CSPRNG, url-safe. Long enough that guessing is not a strategy.
  const token = randomBytes(32).toString('base64url')

  // A new link invalidates any older one of the same kind: asking for a second
  // reset email should not leave the first one live.
  await payload.update({
    collection: 'auth-tokens',
    where: {
      and: [
        { customer: { equals: customer.id } },
        { purpose: { equals: purpose } },
        { consumedAt: { exists: false } },
      ],
    },
    data: { consumedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'auth-tokens',
    data: {
      purpose,
      tokenHash: hash(token),
      customer: customer.id,
      email,
      expiresAt: new Date(Date.now() + TTL_MINUTES[purpose] * 60_000).toISOString(),
    },
    overrideAccess: true,
  })

  return token
}

export type ConsumedToken = { customerId: number; email: string }

/**
 * Redeems a token, or returns null. Consuming is part of the check, not a
 * follow-up: a link that has been used once is dead even if the caller then
 * fails to do anything with it.
 */
export const consumeToken = async (
  payload: Payload,
  purpose: AuthTokenPurpose,
  token: string,
): Promise<ConsumedToken | null> => {
  if (!token) return null

  const { docs } = await payload.find({
    collection: 'auth-tokens',
    where: { and: [{ tokenHash: { equals: hash(token) } }, { purpose: { equals: purpose } }] },
    limit: 1,
    overrideAccess: true,
  })

  const row = docs[0]
  if (!row) return null
  if (row.consumedAt) return null
  if (new Date(row.expiresAt).getTime() < Date.now()) return null

  // The lookup was by hash, so this is belt and braces rather than the real
  // defence — but comparing in constant time costs nothing.
  const stored = Buffer.from(row.tokenHash)
  const offered = Buffer.from(hash(token))
  if (stored.length !== offered.length || !timingSafeEqual(stored, offered)) return null

  await payload.update({
    collection: 'auth-tokens',
    id: row.id,
    data: { consumedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  const customerId = typeof row.customer === 'object' ? row.customer.id : row.customer
  return { customerId, email: row.email }
}
