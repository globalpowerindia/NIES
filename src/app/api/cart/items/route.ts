import { LIMITS } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import type { NextResponse } from 'next/server'

import { fail, invalid, readJson } from '@/lib/api-response'
import { addToCart, resolveVariant, type CartRef } from '@/lib/storefront/cart'
import { cartContext, replyWithCart } from '@/lib/storefront/cart-api'
import { addToCartSchema } from '@/lib/validations/cart'

/** Adds a product or variant. Adding what is already there increases the line. */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = await guardMutation(request, 'cartWrite', LIMITS.cartWrite)
  if (denied) return denied
  const parsed = addToCartSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const { payload, find, findOrCreate } = await cartContext()
  const variantId = await resolveVariant(payload, parsed.data)
  if (!variantId) return fail(404, 'This product is no longer available.')

  let cart: CartRef | null = null
  const getCart = async () => (cart = await findOrCreate())
  const change = await addToCart(payload, getCart, variantId, parsed.data.quantity)
  return replyWithCart(payload, cart ?? (await find()), change)
}
