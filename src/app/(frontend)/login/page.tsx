import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth/AuthShell'
import { FormAlert } from '@/components/auth/fields'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { OtpSignIn, type Channel } from '@/components/auth/OtpSignIn'
import { emailDeliveryAvailable } from '@/lib/auth-email'
import { googleOAuth } from '@/lib/env'
import { smsSender } from '@/lib/otp/sms'
import { safeNext } from '@/lib/safe-redirect'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } }

/** Set by the Google callback and the phone step, which can only report back through the URL. */
const ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled. Please try again.',
  google_failed: 'We could not sign you in with Google. Please try again.',
  google_unavailable: 'Google sign-in is not available right now. Please use another way below.',
  expired: 'That took a little too long, so we stopped for your security. Please sign in again.',
}

export default async function LoginPage(props: PageProps<'/login'>) {
  const { next: rawNext, error } = await props.searchParams
  const next = safeNext(rawNext)
  if (await getCurrentCustomer()) redirect(next)

  const message = typeof error === 'string' ? ERRORS[error] : undefined
  // Only offer what can actually deliver a code here: SMS waits on DLT, email
  // on a real provider in production.
  const channels: Channel[] = []
  if (smsSender()) channels.push('sms')
  if (emailDeliveryAvailable(await getPayloadClient())) channels.push('email')

  return (
    <AuthShell
      title="Sign in or create an account"
      subtitle="New here? The same steps create your account — no password to remember."
    >
      {message && <FormAlert>{message}</FormAlert>}
      <OtpSignIn
        next={next}
        channels={channels}
        google={googleOAuth ? <GoogleButton next={next} /> : undefined}
      />
    </AuthShell>
  )
}
