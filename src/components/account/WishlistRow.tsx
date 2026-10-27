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

  return (
    // Phones keep the picture beside the details, at phone text sizes; from sm up it is the Figma row.
    <article className="flex gap-3 rounded-xl border-[0.5px] border-dark-100 p-3 sm:gap-10 sm:px-5">
      <Link href={item.href} className="relative block size-20 shrink-0 sm:size-27">
        <Image
          src={item.imageUrl}
          alt={item.imageAlt}
          fill
          sizes="(min-width: 40rem) 108px, 80px"
          className="object-contain"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="flex min-w-0 flex-col justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={item.href}
              className="line-clamp-2 text-label1 font-medium text-dark-500 hover:text-brand-blue-500 sm:text-h5"
            >
              {item.name}
            </Link>
            {item.subtitle && <p className="text-body3 text-dark-300 sm:text-label1">{item.subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-8">
            {!item.sellOnline && <EnquireButton productName={item.name} href={item.href} className="h-9 px-3 text-body3 sm:text-body2" />}
            {item.sellOnline && item.inStock && (
              <button
                type="button"
                onClick={moveToCart}
                disabled={moving || removing}
                className="flex items-center gap-1 text-body3 font-medium text-brand-blue-300 sm:text-body1 transition-opacity hover:opacity-80 disabled:opacity-60"
              >
                <ShoppingCart className="size-5 sm:size-6" strokeWidth={1.5} aria-hidden />
                {moving ? 'Moving…' : 'Move to Cart'}
              </button>
            )}
            <button
              type="button"
              onClick={remove}
              disabled={removing || moving}
              className="flex items-center gap-1 text-body3 font-medium text-brand-red-500 sm:text-body1 transition-opacity hover:opacity-80 disabled:opacity-60"
            >
              <Trash2 className="size-5 sm:size-6" strokeWidth={1.5} aria-hidden />
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>

        {item.pricePaise !== null && (
          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <p className="text-h6 font-semibold text-dark-500 sm:text-h4">{cardPrice(item.pricePaise)}</p>
            {discount !== null && item.mrpPaise && (
              <div className="flex items-center gap-1">
                <span className="text-body3 text-dark-300 line-through sm:text-label1">
                  {formatCurrency(item.mrpPaise)}
                </span>
                <span className="flex h-5.5 items-center gap-1 text-label2 font-medium whitespace-nowrap text-brand-blue-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/offer.svg" alt="" width={20} height={20} className="size-5" />
                  {discount}% off
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
