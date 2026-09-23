import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { normaliseEmail } from '@/lib/identity'
import { verifyPassword } from '@/lib/password'
import { startSession } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'
import { loginSchema } from '@/lib/validations/auth'

/** One message for every failure, so the response never says which half was wrong. */
const REJECTED = 'Email or password is incorrect.'

export const POST = async (request: Request): Promise<NextResponse> => {
  const parsed = loginSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { email, password } = parsed.data
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'auth-identities',
    where: {
      and: [{ provider: { equals: 'PASSWORD' } }, { providerAccountId: { equals: normaliseEmail(email) } }],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const identity = docs[0]
  // `verifyPassword` hashes even when there is nothing to compare against, so
  // an unknown address costs the same time as a known one.
  const correct = await verifyPassword(password, identity?.passwordHash)
  if (!identity || !correct) return fail(401, REJECTED)

  const customer =
    typeof identity.customer === 'object'
      ? identity.customer
      : await payload.findByID({ collection: 'customers', id: identity.customer, overrideAccess: true })

  // A blocked account gets the same message: no point confirming it exists.
  if (customer.status === 'BLOCKED') return fail(401, REJECTED)

  await payload.update({
    collection: 'auth-identities',
    id: identity.id,
    data: { lastUsedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  await startSession(customer.id)

  return ok({
    customerId: customer.id,
    emailVerified: Boolean(customer.emailVerifiedAt),
  })
}
