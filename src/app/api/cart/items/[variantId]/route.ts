import type { NextResponse } from 'next/server'

import { fail, invalid, readJson } from '@/lib/api-response'
import { removeFromCart, setCartQuantity } from '@/lib/storefront/cart'
import { cartContext, replyWithCart } from '@/lib/storefront/cart-api'
import { setQuantitySchema } from '@/lib/validations/cart'

const variantIdOf = async (ctx: RouteContext<'/api/cart/items/[variantId]'>) => {
  const id = Number((await ctx.params).variantId)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Sets one line's quantity. 0 removes it. */
export const PATCH = async (
  request: Request,
  ctx: RouteContext<'/api/cart/items/[variantId]'>,
): Promise<NextResponse> => {
  const variantId = await variantIdOf(ctx)
  if (!variantId) return fail(404, 'That item is no longer in your cart.')
  const parsed = setQuantitySchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { payload, find } = await cartContext()
  const cart = await find()
  if (!cart) return fail(404, 'Your cart is empty.')
  return replyWithCart(
    payload,
    cart,
    await setCartQuantity(payload, cart, variantId, parsed.data.quantity),
  )
}

/** Removes a line. Already gone is fine too. */
export const DELETE = async (
  _request: Request,
  ctx: RouteContext<'/api/cart/items/[variantId]'>,
): Promise<NextResponse> => {
  const variantId = await variantIdOf(ctx)
  const { payload, find } = await cartContext()
  const cart = await find()
  if (!cart || !variantId) return replyWithCart(payload, cart, { ok: true })
  return replyWithCart(payload, cart, await removeFromCart(payload, cart, variantId))
}
