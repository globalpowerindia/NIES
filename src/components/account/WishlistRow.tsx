'use client'

import { ShoppingCart, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { addToCart } from '@/components/cart/cart-store'
import { toggleWishlist } from '@/components/wishlist/wishlist-store'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { cardPrice } from '@/components/product/ProductCard'
import { formatCurrency } from '@/lib/money'
import type { WishlistEntry } from '@/lib/storefront/account'
import { cn } from '@/lib/utils'

/** Move to Cart and Remove: the design's 12px Body-4 on phones, Body-1 Medium from sm. */
const actionClass =
  'flex items-center gap-1 text-[0.75rem] leading-4 transition-opacity hover:opacity-80 disabled:opacity-60 sm:text-body1 sm:font-medium'

/** One saved product, from Figma node 1100:28128. */
export const WishlistRow = ({ item }: { item: WishlistEntry }) => {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const [moving, setMoving] = useState(false)
  const discount =
    item.pricePaise && item.mrpPaise && item.mrpPaise > item.pricePaise
      ? Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)
      : null

  const remove = async () => {
    setRemoving(true)
    await toggleWishlist(item.productId)
    router.refresh()
  }

  // Into the cart, then off the list; if the cart refuses, it stays saved.
  const moveToCart = async () => {
    setMoving(true)
    const result = await addToCart({ productId: item.productId })
    if (!result.ok) return setMoving(false)
    await toggleWishlist(item.productId)
    router.refresh()
  }

  // Phones (Figma 1412:32272): picture, then name, price and actions stacked beside it.
  // From sm (1100:28128): name over actions, with the price on the right.
  return (
    <article
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl border-[0.5px] border-dark-100 p-3 [grid-template-areas:"img_name"_"img_price"_"img_actions"]',
        'sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-[auto_1fr] sm:gap-y-4 sm:px-5 sm:[grid-template-areas:"img_name_price"_"img_actions_price"]',
      )}
    >
      <Link
        href={item.href}
        className="relative block size-18 self-start [grid-area:img] sm:mr-6 sm:size-27"
      >
        <Image
          src={item.imageUrl}
          alt={item.imageAlt}
          fill
          sizes="(min-width: 40rem) 108px, 72px"
          className="object-contain"
        />
      </Link>

      <div className="flex min-w-0 flex-col gap-1 [grid-area:name]">
        <Link
          href={item.href}
          className="line-clamp-2 text-label1 font-medium text-dark-500 hover:text-brand-blue-500 sm:text-h5"
        >
          {item.name}
        </Link>
        {item.subtitle && (
          <p className="text-label3 text-dark-300 sm:text-label1">{item.subtitle}</p>
        )}
      </div>

      {item.pricePaise !== null && (
        <div className="flex flex-col gap-1 [grid-area:price] sm:items-end">
          <p className="text-label1 font-semibold text-dark-500 sm:text-h4">
            {cardPrice(item.pricePaise)}
          </p>
          {discount !== null && item.mrpPaise && (
            <div className="flex items-center gap-1">
              <span className="text-label3 text-dark-300 line-through sm:text-label1">
                {formatCurrency(item.mrpPaise)}
              </span>
              <span className="flex h-5.5 items-center gap-1 text-label3 whitespace-nowrap text-brand-blue-300 sm:text-label2 sm:font-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/offer-15.svg"
                  alt=""
                  width={15}
                  height={15}
                  className="size-[0.9375rem] sm:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/offer.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="hidden size-5 sm:block"
                />
                {discount}% off
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2 [grid-area:actions] sm:mt-0 sm:self-end">
        {!item.sellOnline && (
          <EnquireButton
            productName={item.name}
            href={item.href}
            className="h-8 px-3 text-[0.75rem] sm:h-9 sm:text-body2"
          />
        )}
        {item.sellOnline && item.inStock && (
          <button
            type="button"
            onClick={moveToCart}
            disabled={moving || removing}
            className={cn(actionClass, 'text-brand-blue-300')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a 15px SVG icon. */}
            <img
              src="/icons/shopping-cart-15.svg"
              alt=""
              width={15}
              height={15}
              className="size-[0.9375rem] sm:hidden"
            />
            <ShoppingCart className="hidden size-6 sm:block" strokeWidth={1.5} aria-hidden />
            {moving ? 'Moving…' : 'Move to Cart'}
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={removing || moving}
          className={cn(actionClass, 'text-brand-red-500')}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a 15px SVG icon. */}
          <img
            src="/icons/delete-15.svg"
            alt=""
            width={15}
            height={15}
            className="size-[0.9375rem] sm:hidden"
          />
          <Trash2 className="hidden size-6 sm:block" strokeWidth={1.5} aria-hidden />
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </article>
  )
}
