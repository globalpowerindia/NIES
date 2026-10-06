import { LIMITS } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import type { NextResponse } from 'next/server'

import { fail, ok } from '@/lib/api-response'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

/** Takes a product off the signed-in customer's wishlist. Already gone is fine too. */
export const DELETE = async (
  request: Request,
  ctx: RouteContext<'/api/account/wishlist/[productId]'>,
): Promise<NextResponse> => {
  const denied = await guardMutation(request, 'accountWrite', LIMITS.accountWrite)
  if (denied) return denied
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in again.')

  const productId = Number((await ctx.params).productId)
  if (!Number.isInteger(productId) || productId <= 0) return ok()

  const payload = await getPayloadClient()
  await payload.delete({
    collection: 'wishlist-items',
    where: { and: [{ customer: { equals: customer.id } }, { product: { equals: productId } }] },
    overrideAccess: true,
  })
  return ok()
}
