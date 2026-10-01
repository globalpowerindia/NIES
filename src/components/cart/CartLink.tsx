'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

import { useCart } from '@/components/cart/cart-store'

/** The header's cart icon, with the number of units in the cart once it is known. */
export const CartLink = () => {
  const { cart } = useCart()
  const count = cart?.itemCount ?? 0

  return (
    <Link href="/cart" className="relative text-dark-500 hover:text-brand-blue-500">
      <ShoppingCart className="size-8 lg:size-10" strokeWidth={1.5} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-brand-red-500 px-1 text-caption1 font-medium text-light-100"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className="sr-only">
        {count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      </span>
    </Link>
  )
}
