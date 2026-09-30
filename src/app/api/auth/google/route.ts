import { NextResponse } from 'next/server'

import { googleOAuth } from '@/lib/env'
import { GOOGLE_FLOW_COOKIE, GOOGLE_FLOW_MAX_AGE_SECONDS, startGoogleFlow } from '@/lib/oauth/google'
import { safeNext } from '@/lib/safe-redirect'
import { siteUrl } from '@/lib/site-url'

/** Step 1 of Google sign-in: remember what to check later, then hand over to Google. */
export const GET = async (request: Request): Promise<NextResponse> => {
  const next = safeNext(new URL(request.url).searchParams.get('next'))
  if (!googleOAuth) return NextResponse.redirect(`${siteUrl()}/login?error=google_unavailable`)

  const { url, cookie } = await startGoogleFlow(googleOAuth.clientId, next)
  const response = NextResponse.redirect(url)
  response.cookies.set(GOOGLE_FLOW_COOKIE, cookie, {
    httpOnly: true,
    // Lax, not Strict: the callback is a top-level navigation arriving from
    // accounts.google.com, and Strict would withhold the cookie from it.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google',
    maxAge: GOOGLE_FLOW_MAX_AGE_SECONDS,
  })
  return response
}
