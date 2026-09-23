import type { NextResponse } from 'next/server'

import { invalid, ok, readJson } from '@/lib/api-response'
import { sendPasswordResetEmail } from '@/lib/auth-email'
import { issueToken } from '@/lib/auth-tokens'
import { normaliseEmail } from '@/lib/identity'
import { getPayloadClient } from '@/lib/storefront/queries'
import { forgotPasswordSchema } from '@/lib/validations/auth'

/**
 * Always replies the same way, whether or not the address has an account.
 * Anything else — a different message, a different status, a noticeably
 * different response time — turns "forgot password" into a way to test which
 * of a list of emails shop here.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const parsed = forgotPasswordSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const email = normaliseEmail(parsed.data.email)
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'auth-identities',
    where: { and: [{ provider: { equals: 'PASSWORD' } }, { providerAccountId: { equals: email } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const identity = docs[0]
  if (identity) {
    const customer =
      typeof identity.customer === 'object'
        ? identity.customer
        : await payload.findByID({ collection: 'customers', id: identity.customer, overrideAccess: true })

    if (customer.status !== 'BLOCKED') {
      const token = await issueToken(payload, 'PASSWORD_RESET', customer, email)
      await sendPasswordResetEmail(payload, email, token)
    }
  }

  return ok({ emailSent: true })
}
