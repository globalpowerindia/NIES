import type { NextResponse } from 'next/server'

import { invalid, readJson } from '@/lib/api-response'
import { applyCoupon, removeCoupon } from '@/lib/storefront/cart'
import { cartContext, replyWithCart } from '@/lib/storefront/cart-api'
import { couponSchema } from '@/lib/validations/cart'

/** Applies a discount code, or says why it can't be used. */
export const POST = async (request: Request): Promise<NextResponse> => {
  const parsed = couponSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { payload, find } = await cartContext()
  const cart = await find()
  if (!cart)
    return replyWithCart(payload, null, {
      ok: false,
      status: 422,
      error: 'Add something to your cart first.',
    })
  return replyWithCart(payload, cart, await applyCoupon(payload, cart, parsed.data.code))
}

export const DELETE = async (): Promise<NextResponse> => {
  const { payload, find } = await cartContext()
  const cart = await find()
  if (!cart) return replyWithCart(payload, null, { ok: true })
  return replyWithCart(payload, cart, await removeCoupon(payload, cart))
}
