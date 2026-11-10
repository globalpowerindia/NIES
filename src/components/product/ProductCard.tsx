import { ShoppingCart, Star } from 'lucide-react'
import Image from 'next/image'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { HoverPrefetchLink } from '@/components/product/HoverPrefetchLink'
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
  /** False for products sold on enquiry only: no cart buttons, and the enquiry is on the product page. */
  sellOnline?: boolean
  className?: string
}

/** Enquiry-only products often have no price set; never show those as ₹0. */
export const cardPrice = (pricePaise: number) => (pricePaise > 0 ? formatCurrency(pricePaise) : 'Price on request')

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
  sellOnline = false,
  className,
}: ProductCardProps) => {
  const discount = pricePaise > 0 ? discountPercent(pricePaise, mrpPaise) : null
  // Stock only matters for what can be bought here.
  const soldOut = sellOnline && !inStock

  return (
    <div
      className={cn(
        'group card-lift flex flex-col gap-3 rounded-xl bg-light-100 p-2 ring-[0.5px] md:gap-4 ring-inset ring-brand-blue-200',
        className,
      )}
    >
      <div className="relative flex flex-col items-start justify-center gap-1.5 overflow-hidden rounded-lg bg-neutral-200 p-2 md:gap-2.5 md:p-4">
        <div className="flex w-full items-start justify-between">
          {badge === 'new' ? (
            <span className="flex items-center justify-center rounded-full border-[0.5px] border-brand-red-400 bg-brand-red-200 px-2 text-[0.6875rem] leading-5 text-brand-red-500 md:text-body3">
              New
            </span>
          ) : badge === 'bestSeller' ? (
            <span className="flex items-center justify-center rounded-full bg-yellow-600 px-2 text-[0.6875rem] leading-5 text-light-100 md:text-body3">
              Best Seller
            </span>
          ) : (
            <span />
          )}
          <WishlistHeart productId={productId} label={label} iconClassName="size-6 md:size-7" />
        </div>

        <HoverPrefetchLink href={href} className="relative block aspect-square w-full self-center">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 50vw, 250px"
            className={cn('object-contain', soldOut && 'opacity-40')}
          />
          {soldOut && (
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red-500 px-3 py-0.5 text-body3 whitespace-nowrap text-light-100">
              Out Of Stock
            </span>
          )}
        </HoverPrefetchLink>

        {sellOnline && inStock && (
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-[0.4375rem] opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
            <AddToCartButton productId={productId} buyNow variant="blue" className="w-[10.9375rem] flex-1">
              Buy Now
            </AddToCartButton>
            <AddToCartButton productId={productId} variant="red" size="icon" aria-label={`Add ${label} to cart`}>
              <ShoppingCart className="size-5" />
            </AddToCartButton>
          </div>
        )}
      </div>

      <div className="flex min-h-24 flex-col gap-2 px-1 md:min-h-32 md:gap-3 md:px-3">
        <div className="flex flex-col items-start gap-1 md:gap-2">
          {typeof rating === 'number' && (
            <span className="flex items-center justify-center gap-0.5 rounded-full bg-green-400 py-0 pr-2 pl-0.5 text-body3 text-green-100">
              <Star className="size-5 fill-green-100 stroke-green-100" />
              {rating.toFixed(1)}
            </span>
          )}
          <HoverPrefetchLink href={href} className="line-clamp-2 text-body3 text-dark-500 hover:underline md:line-clamp-none md:text-body2">
            {label}
          </HoverPrefetchLink>
          <p className="text-[0.75rem] leading-4 text-dark-300 md:text-label1">{category}</p>
        </div>

        <hr className="border-t border-neutral-300" />

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 md:gap-2">
          <span className="text-body3 font-semibold text-dark-500 md:text-label1">{cardPrice(pricePaise)}</span>
          {pricePaise > 0 && mrpPaise !== undefined && mrpPaise > pricePaise && (
            <span className="text-[0.75rem] text-dark-300 line-through md:text-label1">
              {formatCurrency(mrpPaise)}
            </span>
          )}
          {discount !== null && (
            <span className="flex h-[1.375rem] items-center gap-1 whitespace-nowrap text-[0.75rem] font-medium text-brand-blue-300 md:text-label2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/offer.svg" alt="" width={20} height={20} className="size-4 md:size-5" />
              {discount}% off
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-0 self-start rounded-full">
        <span className="grid size-5 place-items-center">
          <span
            className={cn('size-2 rounded-full', !sellOnline ? 'bg-brand-blue-300' : inStock ? 'bg-green-400' : 'bg-brand-red-500')}
            aria-hidden
          />
        </span>
        <span className={cn('text-[0.75rem] md:text-body3', !sellOnline ? 'text-brand-blue-300' : inStock ? 'text-green-400' : 'text-brand-red-500')}>
          {!sellOnline ? 'Available on enquiry' : inStock ? 'In Stock' : 'Out Of Stock'}
        </span>
      </div>
    </div>
  )
}
