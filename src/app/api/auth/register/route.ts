import type { NextResponse } from 'next/server'

import { invalid, ok, readJson } from '@/lib/api-response'
import { sendVerificationEmail } from '@/lib/auth-email'
import { issueToken } from '@/lib/auth-tokens'
import { normaliseEmail, resolveIdentity } from '@/lib/identity'
import { hashPassword } from '@/lib/password'
import { startSession } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'
import { registerSchema } from '@/lib/validations/auth'

/**
 * Email + password signup.
 *
 * Two things here are deliberate and easy to get wrong:
 *
 * 1. **An address that already has a password account gets the same reply as
 *    a new one, and no session.** Returning "that email is taken" would turn
 *    this endpoint into a way to enumerate customers. Handing out a session
 *    would be far worse — anyone could "register" over your account and be
 *    logged into it without ever knowing your password.
 *
 * 2. **Signup does not verify the email.** The new customer's
 *    `emailVerifiedAt` stays null until they click the link, which is what
 *    stops this account from later absorbing, or being absorbed by, a Google
 *    sign-in on the same address.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const parsed = registerSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { email, password, firstName, lastName, acceptsMarketing } = parsed.data
  const payload = await getPayloadClient()

  const existing = await payload.find({
    collection: 'auth-identities',
    where: {
      and: [{ provider: { equals: 'PASSWORD' } }, { providerAccountId: { equals: normaliseEmail(email) } }],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    // Tell the real owner, not the person at the keyboard.
    await payload.sendEmail({
      to: email,
      subject: 'You already have an account',
      html: `<p>Someone tried to create an account with this email address. You already have one — sign in instead, or reset your password if you have forgotten it.</p>`,
    })
    return ok({ emailSent: true })
  }

  const result = await resolveIdentity(payload, {
    provider: 'PASSWORD',
    providerAccountId: email,
    passwordHash: await hashPassword(password),
    profile: { firstName, lastName },
    // No verifiedEmail: signing up proves nothing about this address yet.
  })

  if (result.outcome === 'BLOCKED') return ok({ emailSent: true })

  if (acceptsMarketing) {
    await payload.update({
      collection: 'customers',
      id: result.customer.id,
      data: { acceptsMarketing: true },
      overrideAccess: true,
    })
  }

  const token = await issueToken(payload, 'EMAIL_VERIFY', result.customer, email)
  await sendVerificationEmail(payload, email, token)

  // Signed in straight away, but unverified. They can shop; they cannot yet
  // link another login method to this account.
  await startSession(result.customer.id)

  return ok({ emailSent: true, customerId: result.customer.id })
}
