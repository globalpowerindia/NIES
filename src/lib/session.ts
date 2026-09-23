import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

import { env } from '@/lib/env'

/**
 * The customer session. Entirely separate from Payload's staff cookie: this
 * token is issued and verified by us, and Payload never authenticates a
 * customer. A staff cookie can therefore never be mistaken for a customer one,
 * or the other way round.
 *
 * The token is deliberately thin — an id and nothing else worth stealing.
 * Anything that matters (status, verified channels) is read from the database
 * on use, so blocking a customer takes effect immediately instead of whenever
 * their token happens to expire.
 */

export const SESSION_COOKIE = 'session_token'

const ISSUER = 'powertools-storefront'
const AUDIENCE = 'customer'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Derived from PAYLOAD_SECRET rather than adding another required env var, but
 * separated by a label so a customer token can never be confused with anything
 * else signed by the same secret.
 */
const key = new TextEncoder().encode(`${env.PAYLOAD_SECRET}:customer-session`)

export type SessionClaims = { customerId: number }

export const signSession = async (customerId: number): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(customerId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key)

export const verifySession = async (token: string): Promise<SessionClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, key, { issuer: ISSUER, audience: AUDIENCE })
    const customerId = Number(payload.sub)
    return Number.isInteger(customerId) && customerId > 0 ? { customerId } : null
  } catch {
    // Expired, tampered with, or signed for something else entirely.
    return null
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export const startSession = async (customerId: number): Promise<void> => {
  const store = await cookies()
  store.set(SESSION_COOKIE, await signSession(customerId), { ...cookieOptions, maxAge: MAX_AGE_SECONDS })
}

export const endSession = async (): Promise<void> => {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
}

/** The signed-in customer's id, or null. Does not touch the database. */
export const getSessionCustomerId = async (): Promise<number | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return (await verifySession(token))?.customerId ?? null
}
