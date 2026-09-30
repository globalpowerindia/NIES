import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { addressSchema } from '@/lib/validations/account'

/** Plenty for a home, an office and a few sites, and a ceiling on junk rows. */
const MAX_ADDRESSES = 20

/** Adds an address for the signed-in customer. */
export const POST = async (request: Request): Promise<NextResponse> => {
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in again.')

  const parsed = addressSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const payload = await getPayloadClient()
  const { totalDocs } = await payload.count({
    collection: 'addresses',
    where: { customer: { equals: customer.id } },
    overrideAccess: true,
  })
  if (totalDocs >= MAX_ADDRESSES) {
    return fail(400, `You can save up to ${MAX_ADDRESSES} addresses. Remove one to add another.`)
  }

  const address = await payload.create({
    collection: 'addresses',
    data: { ...parsed.data, customer: customer.id },
    overrideAccess: true,
  })
  return ok({ id: address.id })
}
