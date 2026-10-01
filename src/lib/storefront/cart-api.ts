import type { NextResponse } from 'next/server'

import { fail, ok } from '@/lib/api-response'
import {
  findCart,
  findOrCreateCart,
  loadCartView,
  type CartChange,
  type CartRef,
} from '@/lib/storefront/cart'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

/** What every /api/cart handler starts from: Payload and whose cart this is. */
export const cartContext = async () => {
  const [payload, customer] = await Promise.all([getPayloadClient(), getCurrentCustomer()])
  const customerId = customer?.id ?? null
  return {
    payload,
    customerId,
    find: () => findCart(payload, customerId),
    findOrCreate: () => findOrCreateCart(payload, customerId),
  }
}

/**
 * Replies to a cart change with the whole cart as it now stands, so the page
 * never has to guess at totals or stock. A refused change still sends the
 * cart, in case it moved underneath the shopper.
 */
export const replyWithCart = async (
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  cart: CartRef | null,
  change: CartChange,
): Promise<NextResponse> => {
  const fresh = cart ? { ...cart, ...(await reloadRef(payload, cart)) } : null
  const view = await loadCartView(payload, fresh)
  if (!change.ok) return fail(change.status, change.error, undefined, { cart: view })
  return ok({ cart: view, notice: change.notice ?? null })
}

/** The coupon may have changed during the request; re-read it rather than trust the old ref. */
const reloadRef = async (payload: Awaited<ReturnType<typeof getPayloadClient>>, cart: CartRef) => {
  const doc = await payload.findByID({
    collection: 'carts',
    id: cart.id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  const coupon = doc?.coupon
  return { couponId: typeof coupon === 'number' ? coupon : (coupon?.id ?? null) }
}
