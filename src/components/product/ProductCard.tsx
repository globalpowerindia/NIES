import { ShoppingCart, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { WishlistHeart } from '@/components/wishlist/WishlistHeart'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

export type ProductCardProps = {
  productId: number
  href: string
  imageUrl: string
  imageAlt: string
  label: string
  category: string
  pricePaise: number
  mrpPaise?: number
  rating?: number
  badge?: 'new' | 'bestSeller'
  inStock?: boolean
  className?: string
}

const discountPercent = (pricePaise: number, mrpPaise?: number): number | null => {
  if (!mrpPaise || mrpPaise <= pricePaise) return null
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100)
}

export const ProductCard = ({
  productId,
  href,
  imageUrl,
  imageAlt,
  label,
  category,
  pricePaise,
  mrpPaise,
  rating,
  badge,
  inStock = true,
  className,
}: ProductCardProps) => {
  const discount = discountPercent(pricePaise, mrpPaise)

  return (
    <div
      className={cn(
        'group flex flex-col gap-4 rounded-xl bg-light-100 p-2 ring-[0.5px] ring-inset ring-brand-blue-200',
        className,
      )}
    >
      <div className="relative flex flex-col items-start justify-center gap-2.5 overflow-hidden rounded-lg bg-neutral-200 p-4">
        <div className="flex w-full items-start justify-between">
          {badge === 'new' ? (
            <span className="flex items-center justify-center rounded-full border-[0.5px] border-brand-red-400 bg-brand-red-200 px-2 text-body3 text-brand-red-500">
              New
            </span>
          ) : badge === 'bestSeller' ? (
            <span className="flex items-center justify-center rounded-full bg-yellow-600 px-2 text-body3 text-light-100">
              Best Seller
            </span>
          ) : (
            <span />
          )}
          <WishlistHeart productId={productId} label={label} iconClassName="size-7" />
        </div>

        <Link href={href} className="relative block size-[170px] max-w-full self-center md:aspect-square md:size-auto md:w-full">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 50vw, 250px"
            className={cn('object-contain', !inStock && 'opacity-40')}
          />
          {!inStock && (
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red-500 px-3 py-0.5 text-body3 whitespace-nowrap text-light-100">
              Out Of Stock
            </span>
          )}
        </Link>

        {inStock && (
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-[7px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
            <AddToCartButton productId={productId} buyNow variant="blue" className="w-[175px] flex-1">
              Buy Now
            </AddToCartButton>
            <AddToCartButton productId={productId} variant="red" size="icon" aria-label={`Add ${label} to cart`}>
              <ShoppingCart className="size-5" />
            </AddToCartButton>
          </div>
        )}
      </div>

      <div className="flex min-h-32 flex-col gap-3 px-3">
        <div className="flex flex-col items-start gap-2">
          {typeof rating === 'number' && (
            <span className="flex items-center justify-center gap-0.5 rounded-full bg-green-400 py-0 pr-2 pl-0.5 text-body3 text-green-100">
              <Star className="size-5 fill-green-100 stroke-green-100" />
              {rating.toFixed(1)}
            </span>
          )}
          <Link href={href} className="text-body2 text-dark-500 hover:underline">
            {label}
          </Link>
          <p className="text-label1 text-dark-300">{category}</p>
        </div>

        <hr className="border-t border-neutral-300" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label1 font-semibold text-dark-500">
            {formatCurrency(pricePaise)}
          </span>
          {mrpPaise !== undefined && mrpPaise > pricePaise && (
            <span className="text-label1 text-dark-300 line-through">
              {formatCurrency(mrpPaise)}
            </span>
          )}
          {discount !== null && (
            <span className="flex h-[22px] items-center gap-1 whitespace-nowrap text-label2 font-medium text-brand-blue-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/offer.svg" alt="" width={20} height={20} className="size-5" />
              {discount}% off
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-0 self-start rounded-full">
        <span className="grid size-5 place-items-center">
          <span
            className={cn('size-2 rounded-full', inStock ? 'bg-green-400' : 'bg-brand-red-500')}
            aria-hidden
          />
        </span>
        <span className={cn('text-body3', inStock ? 'text-green-400' : 'text-brand-red-500')}>
          {inStock ? 'In Stock' : 'Out Of Stock'}
        </span>
      </div>
    </div>
  )
}
