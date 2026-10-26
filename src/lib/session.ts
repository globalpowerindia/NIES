import 'server-only'

import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

import { createSessionRecord, revokeSession } from '@/lib/customer-sessions'
import { env } from '@/lib/env'
import { getPayloadClient } from '@/lib/storefront/queries'

/**
 * The customer session. Entirely separate from Payload's staff cookie: this
 * token is issued and verified by us, and Payload never authenticates a
 * customer. A staff cookie can therefore never be mistaken for a customer one,
 * or the other way round.
 *
 * The token is deliberately thin — a customer id and the id of its
 * `customer-sessions` row. Anything that matters (status, verified channels,
 * whether the session was revoked) is read from the database on use, so
 * signing out or blocking a customer takes effect immediately instead of
 * whenever their token happens to expire. See `src/lib/customer-sessions.ts`.
 */

export const SESSION_COOKIE = 'session_token'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const ISSUER = 'powertools-storefront'
const AUDIENCE = 'customer'

/**
 * Derived from PAYLOAD_SECRET rather than adding another required env var, but
 * separated by a label so a customer token can never be confused with anything
 * else signed by the same secret.
 */
const key = new TextEncoder().encode(`${env.PAYLOAD_SECRET}:customer-session`)

export type SessionClaims = { customerId: number; sessionId: number }

const isId = (value: number) => Number.isInteger(value) && value > 0

export const signSession = async ({ customerId, sessionId }: SessionClaims): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(customerId))
    .setJti(String(sessionId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key)

/** Checks the signature only. Whether the session is still live is `customerForSession`'s job. */
export const verifySession = async (token: string): Promise<SessionClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, key, { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] })
    const customerId = Number(payload.sub)
    const sessionId = Number(payload.jti)
    // Tokens from before sessions were revocable carry no jti, and are refused.
    return isId(customerId) && isId(sessionId) ? { customerId, sessionId } : null
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
  const sessionId = await createSessionRecord(await getPayloadClient(), customerId, SESSION_MAX_AGE_SECONDS)
  const store = await cookies()
  store.set(SESSION_COOKIE, await signSession({ customerId, sessionId }), { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS })
}

/** Ends this session on the server as well as in this browser, so a copied cookie stops working too. */
export const endSession = async (): Promise<void> => {
  const claims = await getSessionClaims()
  if (claims) await revokeSession(await getPayloadClient(), claims.sessionId)
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
}

/** The cookie's signed claims, or null. Does not check that the session is still live. */
export const getSessionClaims = async (): Promise<SessionClaims | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? verifySession(token) : null
}
