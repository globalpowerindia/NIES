import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { consumeToken } from '@/lib/auth-tokens'
import { normaliseEmail } from '@/lib/identity'
import { hashPassword } from '@/lib/password'
import { startSession } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'
import { resetPasswordSchema } from '@/lib/validations/auth'

export const POST = async (request: Request): Promise<NextResponse> => {
  const parsed = resetPasswordSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const payload = await getPayloadClient()
  const consumed = await consumeToken(payload, 'PASSWORD_RESET', parsed.data.token)
  if (!consumed) {
    return fail(400, 'This reset link has expired or has already been used. Please request a new one.')
  }

  const email = normaliseEmail(consumed.email)
  const { docs } = await payload.find({
    collection: 'auth-identities',
    where: {
      and: [
        { provider: { equals: 'PASSWORD' } },
        { providerAccountId: { equals: email } },
        { customer: { equals: consumed.customerId } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  const identity = docs[0]
  if (!identity) return fail(400, 'This reset link is no longer valid.')

  await payload.update({
    collection: 'auth-identities',
    id: identity.id,
    data: { passwordHash: await hashPassword(parsed.data.password), lastUsedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  const customer = await payload.findByID({
    collection: 'customers',
    id: consumed.customerId,
    overrideAccess: true,
  })

  // Receiving mail at this address is proof of control, which is the same
  // thing the verification link asks for — so a reset confirms the email too,
  // unless someone else has meanwhile verified it.
  if (!customer.emailVerifiedAt) {
    const others = await payload.find({
      collection: 'customers',
      where: {
        and: [
          { email: { equals: email } },
          { emailVerifiedAt: { exists: true } },
          { id: { not_equals: customer.id } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (others.docs.length === 0) {
      await payload.update({
        collection: 'customers',
        id: customer.id,
        data: { email, emailVerifiedAt: new Date().toISOString() },
        overrideAccess: true,
      })
    }
  }

  if (customer.status === 'BLOCKED') return ok({ signedIn: false })

  await startSession(customer.id)
  return ok({ signedIn: true })
}
