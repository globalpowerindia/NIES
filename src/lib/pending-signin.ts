import 'server-only'

import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

import { env } from '@/lib/env'

/**
 * A Google sign-in that is waiting for its mobile number.
 *
 * Google proves who someone is but not how to deliver to them, and without a
 * verified phone a later SMS sign-in could not find this account. So a Google
 * customer without one gets this cookie instead of a session, and only
 * becomes signed in once `/login/phone` has verified a number.
 *
 * Short-lived and scoped: it grants nothing except the right to finish that
 * one step.
 */

const COOKIE = 'pending_signin'
const MAX_AGE_SECONDS = 15 * 60
const key = new TextEncoder().encode(`${env.PAYLOAD_SECRET}:pending-signin`)

export type PendingSignIn = { customerId: number; next: string }

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export const startPendingSignIn = async (pending: PendingSignIn): Promise<void> => {
  const token = await new SignJWT(pending)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key)
  ;(await cookies()).set(COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_SECONDS })
}

export const readPendingSignIn = async (): Promise<PendingSignIn | null> => {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify<PendingSignIn>(token, key)
    return Number.isInteger(payload.customerId) ? { customerId: payload.customerId, next: payload.next } : null
  } catch {
    return null
  }
}

export const endPendingSignIn = async (): Promise<void> => {
  ;(await cookies()).set(COOKIE, '', { ...cookieOptions, maxAge: 0 })
}
