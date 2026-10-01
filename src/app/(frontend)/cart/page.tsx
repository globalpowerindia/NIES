import type { Metadata } from 'next'

import { CartPage } from '@/components/cart/CartPage'
import { findCart, loadCartView } from '@/lib/storefront/cart'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Cart', robots: { index: false, follow: false } }

/** The shopper's cart, priced at today's prices. Per-shopper, so never cached. */
export default async function Cart() {
  const [payload, customer] = await Promise.all([getPayloadClient(), getCurrentCustomer()])
  const cart = await loadCartView(payload, await findCart(payload, customer?.id ?? null))
  return <CartPage initial={cart} signedIn={Boolean(customer)} />
}
