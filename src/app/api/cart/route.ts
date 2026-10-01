import type { NextResponse } from 'next/server'

import { ok } from '@/lib/api-response'
import { loadCartView } from '@/lib/storefront/cart'
import { cartContext } from '@/lib/storefront/cart-api'

/** The shopper's cart, priced at today's prices. Never creates one. */
export const GET = async (): Promise<NextResponse> => {
  const { payload, find } = await cartContext()
  return ok({ cart: await loadCartView(payload, await find()) })
}
