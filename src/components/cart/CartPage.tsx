'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useLayoutEffect } from 'react'

import { CartRow } from '@/components/cart/CartRow'
import { CartSummary } from '@/components/cart/CartSummary'
import { seedCart, useCart } from '@/components/cart/cart-store'
import { ButtonLink } from '@/components/ui/button'
import type { CartView } from '@/lib/storefront/cart'

/**
 * The cart, from Figma node 1096:27408. Rendered on the server for a fast
 * first paint, then driven by the shared store so every change (here, or from
 * the header) redraws it.
 */
export const CartPage = ({ initial, signedIn }: { initial: CartView; signedIn: boolean }) => {
  useLayoutEffect(() => seedCart(initial), [initial])
  const { cart: live } = useCart()
  const cart = live ?? initial
  const count = cart.itemCount

  return (
    <main className="bg-light-400 pb-6">
      <div className="container-page pt-6">
        {cart.lines.length === 0 ? (
          <section className="flex flex-col items-center gap-4 rounded-lg bg-light-100 px-5 py-16 text-center">
            <span className="grid size-25 place-items-center rounded-full bg-brand-blue-100 text-brand-blue-500">
              <ShoppingCart className="size-12" strokeWidth={1.25} aria-hidden />
            </span>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-h4 font-semibold text-dark-500">Your cart is empty</h1>
              <p className="text-label1 text-dark-300">
                Add tools and accessories to see them here.
              </p>
            </div>
            <ButtonLink href="/products" variant="blue" className="h-12.5 w-58">
              Continue Shopping
            </ButtonLink>
            {!signedIn && (
              <p className="text-label1 text-dark-300">
                Added items before?{' '}
                <Link
                  href="/login?next=/cart"
                  className="font-medium text-brand-blue-300 hover:underline"
                >
                  Sign in
                </Link>{' '}
                to see your saved cart.
              </p>
            )}
          </section>
        ) : (
          <div className="flex flex-col items-start gap-6 lg:flex-row">
            <section className="flex w-full min-w-0 flex-1 flex-col gap-4 rounded-lg bg-light-100 p-5">
              <h1 className="text-h6 text-dark-500">
                <span className="font-semibold">Cart</span>{' '}
                <span className="text-label1 text-dark-300">
                  ({count} item{count === 1 ? '' : 's'})
                </span>
              </h1>
              <hr className="w-full border-t-[0.5px] border-dark-100" />
              {cart.lines.map((line) => (
                <CartRow key={line.variantId} line={line} />
              ))}
            </section>
            <CartSummary cart={cart} />
          </div>
        )}
      </div>
    </main>
  )
}
