import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { attachPhone, normaliseEmail, normalisePhone, resolveIdentity } from '@/lib/identity'
import { checkChallenge } from '@/lib/otp/challenges'
import { endPendingSignIn, readPendingSignIn } from '@/lib/pending-signin'
import { startSession } from '@/lib/session'
import { afterSignIn } from '@/lib/storefront/after-sign-in'
import { getPayloadClient } from '@/lib/storefront/queries'
import { otpVerifySchema } from '@/lib/validations/auth'
import type { Customer } from '@/payload-types'

const SUSPENDED = 'This account has been suspended. Please contact us for help.'

/**
 * Checks a code and signs the customer in — creating the account if this is
 * the first time we have seen that number or email.
 *
 * With `purpose: 'link'` it instead finishes a Google sign-in that was waiting
 * for a mobile number (see `src/lib/pending-signin.ts`).
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const parsed = otpVerifySchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { channel, code, purpose } = parsed.data
  const destination =
    channel === 'sms' ? normalisePhone(parsed.data.destination) : normaliseEmail(parsed.data.destination)

  const pending = purpose === 'link' ? await readPendingSignIn() : null
  if (purpose === 'link' && !pending) return fail(401, 'Your sign-in has timed out. Please start again.')

  const payload = await getPayloadClient()
  const check = await checkChallenge(payload, {
    channel: channel === 'sms' ? 'SMS' : 'EMAIL',
    destination,
    code,
  })

  if (!check.ok) {
    switch (check.reason) {
      case 'WRONG_CODE': {
        const message = `That code is not right. ${check.attemptsLeft} ${check.attemptsLeft === 1 ? 'try' : 'tries'} left.`
        return fail(400, message, { code: message })
      }
      case 'TOO_MANY_ATTEMPTS':
        return fail(400, 'Too many wrong tries. Please ask for a new code.')
      default:
        return fail(400, 'This code has expired or was already used. Please ask for a new one.')
    }
  }

  let customer: Customer

  if (pending) {
    const attached = await attachPhone(payload, pending.customerId, destination)
    if (attached.outcome === 'CONFLICT') {
      return fail(
        409,
        'This mobile number already belongs to another account. Sign in with the number instead, or use a different one.',
      )
    }
    customer = attached.customer
    await endPendingSignIn()
  } else {
    const result = await resolveIdentity(
      payload,
      channel === 'sms'
        ? { provider: 'PHONE_OTP', providerAccountId: destination, verifiedPhone: destination }
        : { provider: 'EMAIL_OTP', providerAccountId: destination, verifiedEmail: destination },
    )
    customer = result.customer
  }

  // They proved the code, so there is no enumeration to protect against here.
  if (customer.status === 'BLOCKED') return fail(403, SUSPENDED)

  await startSession(customer.id)
  await afterSignIn(payload, customer)
  return ok({ needsName: !customer.firstName, next: pending?.next })
}
