import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth/AuthShell'
import { OtpSignIn } from '@/components/auth/OtpSignIn'
import { readPendingSignIn } from '@/lib/pending-signin'

export const metadata: Metadata = {
  title: 'Add your mobile number',
  robots: { index: false, follow: false },
}

/**
 * The last step of a first Google sign-in. See `src/lib/pending-signin.ts` for
 * why the session waits for this.
 */
export default async function AddPhonePage() {
  const pending = await readPendingSignIn()
  if (!pending) redirect('/login?error=expired')

  return (
    <AuthShell
      title="One more step"
      subtitle="Add your mobile number for delivery updates. Next time, you can sign in with it too."
    >
      <OtpSignIn next={pending.next} purpose="link" channels={['sms']} />
    </AuthShell>
  )
}
