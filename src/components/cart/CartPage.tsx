'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useLayoutEffect } from 'react'

import { CartRow } from '@/components/cart/CartRow'
import { CartSummary } from '@/components/cart/CartSummary'
import { seedCart, useCart } from '@/components/cart/cart-store'
import { PhoneBackTitle } from '@/components/layout/PhoneBackTitle'
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
    <main className="bg-light-100 pb-6 sm:bg-light-400">
      <div className="container-page pt-4 sm:pt-6">
        {cart.lines.length === 0 ? (
          <section className="flex flex-col items-center gap-4 rounded-lg bg-light-100 px-5 py-16 text-center">
            <span className="grid size-25 place-items-center rounded-full bg-brand-blue-100 text-brand-blue-500">
              <ShoppingCart className="size-12" strokeWidth={1.25} aria-hidden />
            </span>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-h5 font-semibold text-dark-500 sm:text-h4">Your cart is empty</h1>
              <p className="text-body3 text-dark-300 sm:text-label1">
                Add tools and accessories to see them here.
              </p>
            </div>
            <ButtonLink href="/products" variant="blue" className="h-12.5 w-58">
              Continue Shopping
            </ButtonLink>
            {!signedIn && (
              <p className="text-body3 text-dark-300 sm:text-label1">
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
            {/* Phones (Figma 1408:30668): cards straight on the page under a back arrow and title. */}
            <section className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:gap-4 sm:rounded-lg sm:bg-light-100 sm:p-5">
              <PhoneBackTitle
                fallback="/products"
                className="mb-4 sm:mb-0"
                arrowClassName="sm:hidden"
                titleClassName="font-normal sm:text-h6"
              >
                <span className="font-medium sm:font-semibold">Cart</span>{' '}
                <span className="text-label2 font-normal text-dark-300 sm:text-label1">
                  ({count} item{count === 1 ? '' : 's'})
                </span>
              </PhoneBackTitle>
              <hr className="hidden w-full border-t-[0.5px] border-dark-100 sm:block" />
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
