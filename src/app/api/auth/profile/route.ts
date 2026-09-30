import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { getSessionCustomerId } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'
import { profileSchema } from '@/lib/validations/auth'

/** The name step after a first sign-in by code, which proves a number or email but says nothing about who. */
export const POST = async (request: Request): Promise<NextResponse> => {
  const customerId = await getSessionCustomerId()
  if (!customerId) return fail(401, 'Please sign in again.')

  const parsed = profileSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'customers',
    id: customerId,
    data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName || null },
    overrideAccess: true,
  })
  return ok()
}
