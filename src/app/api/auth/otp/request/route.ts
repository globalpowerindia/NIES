import { mutationGuard } from '@/lib/request-security'
import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { emailDeliveryAvailable, sendOtpEmail } from '@/lib/auth-email'
import { normaliseEmail, normalisePhone } from '@/lib/identity'
import { issueChallenge } from '@/lib/otp/challenges'
import { smsSender } from '@/lib/otp/sms'
import { readPendingSignIn } from '@/lib/pending-signin'
import { clientIp } from '@/lib/request-ip'
import { getPayloadClient } from '@/lib/storefront/queries'
import { otpRequestSchema } from '@/lib/validations/auth'

/**
 * Sends a sign-in code by SMS or email.
 *
 * Anyone may ask — signing in and signing up are the same step — so the reply
 * says nothing about whether an account exists. What it does say is when a
 * new code may be requested, because the limits in `issueChallenge` are the
 * only thing between this endpoint and a large SMS bill.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = mutationGuard(request)
  if (denied) return denied
  const parsed = otpRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { channel, purpose } = parsed.data
  const payload = await getPayloadClient()

  // The Google follow-up step is only for someone who is actually mid-way
  // through it; otherwise this would be an unauthenticated SMS cannon.
  if (purpose === 'link' && !(await readPendingSignIn())) {
    return fail(401, 'Your sign-in has timed out. Please start again.')
  }

  const sms = channel === 'sms' ? smsSender() : null
  if (channel === 'sms' && !sms) {
    return fail(503, 'Mobile sign-in is not available right now. Please use your email instead.')
  }
  if (channel === 'email' && !emailDeliveryAvailable(payload)) {
    return fail(503, 'Email sign-in is not available right now. Please use your mobile number instead.')
  }

  const destination =
    channel === 'sms' ? normalisePhone(parsed.data.destination) : normaliseEmail(parsed.data.destination)

  const issued = await issueChallenge(payload, {
    channel: channel === 'sms' ? 'SMS' : 'EMAIL',
    destination,
    ip: clientIp(request),
  })

  if (!issued.ok) {
    const minutes = Math.ceil(issued.retryAfterSeconds / 60)
    return fail(
      429,
      issued.retryAfterSeconds <= 60
        ? `Please wait ${issued.retryAfterSeconds} seconds before asking for another code.`
        : `Too many codes requested. Please try again in ${minutes} minutes.`,
    )
  }

  try {
    if (sms) await sms.send(destination, issued.code)
    else await sendOtpEmail(payload, destination, issued.code)
  } catch (error) {
    payload.logger.error({ err: error, channel }, 'Sending sign-in code failed')
    return fail(502, 'We could not send the code just now. Please try again in a moment.')
  }

  return ok({ resendAfter: issued.resendAfterSeconds })
}
