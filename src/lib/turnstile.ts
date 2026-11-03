import 'server-only'

import { env } from '@/lib/env'

/**
 * Cloudflare Turnstile in front of sign-in codes. Every code costs an SMS or
 * an email, and the per-number and per-IP limits don't stop a bot that
 * rotates both; a token Cloudflare issued to a real browser does.
 *
 * On only when both keys are set. Tokens are single-use, so the form fetches
 * a fresh one for each send, resends included.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export const turnstileEnabled = (): boolean => Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY)

/**
 * Whether Cloudflare vouches for this token. Fails closed: if Cloudflare
 * can't be reached the code isn't sent, since letting requests through
 * unchecked is exactly the bill this guards against.
 */
export const verifyTurnstile = async (token: string | undefined, ip: string): Promise<boolean> => {
  if (!env.TURNSTILE_SECRET_KEY || !token) return false
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
  if (ip !== 'unknown') body.set('remoteip', ip)
  const response = await fetch(SITEVERIFY_URL, { method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(5_000) })
  if (!response.ok) throw new Error(`Turnstile siteverify answered HTTP ${response.status}`)
  const reply = (await response.json()) as { success?: boolean }
  return reply.success === true
}
