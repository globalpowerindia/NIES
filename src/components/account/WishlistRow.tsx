'use client'

import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { toggleWishlist } from '@/components/wishlist/wishlist-store'
import { formatCurrency } from '@/lib/money'
import type { WishlistEntry } from '@/lib/storefront/account'

/**
 * One saved product, from Figma node 1100:28128. "Move to Cart" from the design
 * joins it once the cart exists (Module 6).
 */
export const WishlistRow = ({ item }: { item: WishlistEntry }) => {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const discount =
    item.pricePaise !== null && item.mrpPaise && item.mrpPaise > item.pricePaise
      ? Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)
      : null

  const remove = async () => {
    setRemoving(true)
    await toggleWishlist(item.productId)
    router.refresh()
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border-[0.5px] border-dark-100 px-5 py-3 sm:flex-row sm:gap-10">
      <Link href={item.href} className="relative block size-27 shrink-0 self-center sm:self-start">
        <Image
          src={item.imageUrl}
          alt={item.imageAlt}
          fill
          sizes="108px"
          className="object-contain"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 sm:flex-row">
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={item.href}
              className="text-h5 font-medium text-dark-500 hover:text-brand-blue-500"
            >
              {item.name}
            </Link>
            {item.subtitle && <p className="text-label1 text-dark-300">{item.subtitle}</p>}
          </div>
          <div className="flex items-start gap-8">
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className="flex items-center gap-1 text-body1 font-medium text-brand-red-500 transition-opacity hover:opacity-80 disabled:opacity-60"
            >
              <Trash2 className="size-6" strokeWidth={1.5} aria-hidden />
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>

        {item.pricePaise !== null && (
          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <p className="text-h4 font-semibold text-dark-500">{formatCurrency(item.pricePaise)}</p>
            {discount !== null && item.mrpPaise && (
              <div className="flex items-center gap-1">
                <span className="text-label1 text-dark-300 line-through">
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
