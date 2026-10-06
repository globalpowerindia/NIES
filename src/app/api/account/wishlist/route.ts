import { LIMITS } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { wishlistSchema } from '@/lib/validations/account'

/**
 * The product ids on the signed-in customer's wishlist, for filling in the
 * hearts on otherwise static pages. Signed out, simply an empty list.
 */
export const GET = async (): Promise<NextResponse> => {
  const customer = await getCurrentCustomer()
  if (!customer) return ok({ signedIn: false, productIds: [] })

  const payload = await getPayloadClient()
  const items = await payload.find({
    collection: 'wishlist-items',
    where: { customer: { equals: customer.id } },
    pagination: false,
    depth: 0,
    select: { product: true },
    overrideAccess: true,
  })
  return ok({ signedIn: true, productIds: items.docs.map((item) => item.product as number) })
}

/** Hearts a product. Hearting it again is a no-op, not an error. */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = await guardMutation(request, 'accountWrite', LIMITS.accountWrite)
  if (denied) return denied
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in to save products.')

  const parsed = wishlistSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)
  const { productId } = parsed.data

  const payload = await getPayloadClient()
  const product = await payload.count({
    collection: 'products',
    where: { id: { equals: productId } },
  })
  if (!product.totalDocs) return fail(404, 'That product is no longer available.')

  const existing = await payload.count({
    collection: 'wishlist-items',
    where: { and: [{ customer: { equals: customer.id } }, { product: { equals: productId } }] },
    overrideAccess: true,
  })
  if (!existing.totalDocs) {
    try {
      await payload.create({
        collection: 'wishlist-items',
        data: { customer: customer.id, product: productId },
        overrideAccess: true,
      })
    } catch {
      // A double-click raced us to it; the unique index kept one row, which is the goal.
    }
  }
  return ok()
}
