import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { googleOAuth } from '@/lib/env'
import { resolveIdentity } from '@/lib/identity'
import {
  exchangeGoogleCode,
  GOOGLE_FLOW_COOKIE,
  readGoogleFlow,
  verifyGoogleIdToken,
} from '@/lib/oauth/google'
import { smsSender } from '@/lib/otp/sms'
import { startPendingSignIn } from '@/lib/pending-signin'
import { startSession } from '@/lib/session'
import { afterSignIn } from '@/lib/storefront/after-sign-in'
import { siteUrl } from '@/lib/site-url'
import { getPayloadClient } from '@/lib/storefront/queries'

const toLogin = (error: string): NextResponse =>
  NextResponse.redirect(`${siteUrl()}/login?error=${error}`)

/**
 * Step 2 of Google sign-in. Every failure lands back on /login with a short
 * code; the details stay here, since none of them help the customer and some
 * would help an attacker.
 */
export const GET = async (request: Request): Promise<NextResponse> => {
  const params = new URL(request.url).searchParams
  const store = await cookies()
  const flow = await readGoogleFlow(store.get(GOOGLE_FLOW_COOKIE)?.value)
  // Single use, whatever happens next.
  store.set(GOOGLE_FLOW_COOKIE, '', { path: '/api/auth/google', maxAge: 0 })

  // The customer pressed Cancel on Google's screen.
  if (params.get('error') === 'access_denied') return toLogin('google_cancelled')

  const code = params.get('code')
  if (!googleOAuth || !flow || !code || params.get('state') !== flow.state)
    return toLogin('google_failed')

  const idToken = await exchangeGoogleCode(googleOAuth, code, flow.verifier)
  const profile = idToken
    ? await verifyGoogleIdToken(idToken, { clientId: googleOAuth.clientId, nonce: flow.nonce })
    : null
  if (!profile) return toLogin('google_failed')

  const payload = await getPayloadClient()
  const result = await resolveIdentity(payload, {
    provider: 'GOOGLE',
    providerAccountId: profile.sub,
    // Only an address Google itself vouches for may link to an existing
    // account. Anything else is just a claim — see resolveIdentity.
    verifiedEmail: profile.emailVerified ? profile.email : null,
    profile: { firstName: profile.firstName, lastName: profile.lastName },
  })

  // Same answer as a failed login: no point confirming a blocked account exists.
  if (result.outcome === 'BLOCKED') return toLogin('google_failed')

  // No verified mobile yet: hold off on the session until they add one, so
  // this account can always be found again by SMS sign-in. Skipped while no
  // SMS provider is configured (DLT pending), since the step could not finish;
  // they are asked for a number again once SMS is live.
  if (!result.customer.phoneVerifiedAt && smsSender()) {
    await startPendingSignIn({ customerId: result.customer.id, next: flow.next })
    return NextResponse.redirect(`${siteUrl()}/login/phone`)
  }

  await startSession(result.customer.id)
  await afterSignIn(payload, result.customer)
  return NextResponse.redirect(`${siteUrl()}${flow.next}`)
}
