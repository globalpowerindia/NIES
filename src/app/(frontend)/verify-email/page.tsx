import type { Metadata } from 'next'
import Link from 'next/link'

import { consumeToken } from '@/lib/auth-tokens'
import { normaliseEmail } from '@/lib/identity'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false, follow: false } }

type Outcome = 'VERIFIED' | 'ALREADY' | 'TAKEN' | 'INVALID'

const MESSAGES: Record<Outcome, { heading: string; body: string }> = {
  VERIFIED: {
    heading: 'Email confirmed',
    body: 'Thanks — your address is confirmed. You can now sign in with Google on this address too, and your orders will stay attached to your account.',
  },
  ALREADY: {
    heading: 'Already confirmed',
    body: 'This address was confirmed already. Nothing more to do.',
  },
  TAKEN: {
    heading: 'This address belongs to another account',
    body: 'Someone has since confirmed this email on a different account, so this link can no longer be used. If that was not you, please contact us.',
  },
  INVALID: {
    heading: 'This link has expired',
    body: 'Confirmation links last 24 hours and can only be used once. Sign in and we will send you a fresh one.',
  },
}

const verify = async (token: string): Promise<Outcome> => {
  const payload = await getPayloadClient()
  const consumed = await consumeToken(payload, 'EMAIL_VERIFY', token)
  if (!consumed) return 'INVALID'

  const email = normaliseEmail(consumed.email)

  // The link was issued before anything else happened to this address. If
  // another account has since *verified* it — say the real owner arrived via
  // Google while this one sat unconfirmed — this link must not create a
  // second verified owner of the same address.
  const others = await payload.find({
    collection: 'customers',
    where: {
      and: [
        { email: { equals: email } },
        { emailVerifiedAt: { exists: true } },
        { id: { not_equals: consumed.customerId } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (others.docs.length > 0) return 'TAKEN'

  const customer = await payload.findByID({
    collection: 'customers',
    id: consumed.customerId,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!customer) return 'INVALID'
  if (customer.emailVerifiedAt) return 'ALREADY'

  await payload.update({
    collection: 'customers',
    id: customer.id,
    // Re-assert the address as well as the timestamp: it may have been
    // released while this account sat unverified.
    data: { email, emailVerifiedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  return 'VERIFIED'
}

export default async function VerifyEmailPage(props: PageProps<'/verify-email'>) {
  const raw = await props.searchParams
  const token = typeof raw.token === 'string' ? raw.token : ''
  const outcome = token ? await verify(token) : 'INVALID'
  const { heading, body } = MESSAGES[outcome]

  return (
    <main className="bg-light-400 py-16">
      <div className="container-page">
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4 rounded-xl bg-light-100 px-6 py-14 text-center">
          <h1 className="text-h5 font-semibold text-dark-500">{heading}</h1>
          <p className="text-body2 text-dark-300">{body}</p>
          <Link
            href="/"
            className="mt-2 rounded-xl bg-brand-blue-500 px-6 py-2 text-body2 font-medium text-light-100 hover:bg-brand-blue-600"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  )
}
