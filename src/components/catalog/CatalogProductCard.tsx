import { ShoppingCart, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { ProductCard, type ProductCardProps } from '@/components/product/ProductCard'
import { WishlistHeart } from '@/components/wishlist/WishlistHeart'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

/** The listing's 171px mobile card has its actions below the product details. */
export const CatalogProductCard = (props: ProductCardProps) => {
  const {
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
  } = props
  const discounted = mrpPaise !== undefined && mrpPaise > pricePaise
  const discount = discounted ? Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100) : null

  return (
    <>
      <ProductCard {...props} className="hidden w-full lg:flex" />
      <article className="flex w-full min-w-0 flex-col gap-2 rounded-xl bg-light-100 p-2 ring-[0.5px] ring-inset ring-brand-blue-200 lg:hidden">
        <div className="flex h-[11.4375rem] flex-col gap-2.5 rounded-lg bg-neutral-200 p-2">
          <div className="flex h-[1.125rem] items-center justify-between gap-1">
            {badge ? (
              <span
                className={cn(
                  'truncate rounded-full px-1.5 text-[0.625rem] leading-[0.875rem]',
                  badge === 'new'
                    ? 'border-[0.5px] border-brand-red-400 bg-brand-red-200 text-brand-red-500'
                    : 'bg-yellow-600 text-light-100',
                )}
              >
                {badge === 'new' ? 'New' : 'Best Seller'}
              </span>
            ) : (
              <span />
            )}
            <WishlistHeart productId={productId} label={label} iconClassName="size-[1.125rem]" />
          </div>
          <Link href={href} className="relative block h-[8.6875rem] w-full">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 767px) 40vw, 250px"
              className={cn('object-contain', !inStock && 'opacity-40')}
            />
          </Link>
        </div>
        <div className="flex min-h-[11.875rem] flex-1 flex-col gap-1.5">
          {typeof rating === 'number' && (
            <span className="flex h-[1.125rem] items-center gap-0.5 self-start rounded-full bg-green-400 pr-1.5 pl-0.5 text-[0.75rem] leading-[1.125rem] text-green-100">
              <Star className="size-3.5 fill-green-100 stroke-green-100" aria-hidden />
              {rating.toFixed(1)}
            </span>
          )}
          <Link
            href={href}
            className="text-[0.75rem] leading-[1.125rem] font-medium text-dark-500 hover:underline"
          >
            {label}
          </Link>
          <p className="text-[0.625rem] leading-3 text-dark-300">{category}</p>
          <hr className="border-neutral-300" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-label1 font-semibold text-dark-500">
              {formatCurrency(pricePaise)}
            </span>
            {discounted && (
              <span className="text-[0.75rem] leading-[1.125rem] text-dark-300 line-through">
                {formatCurrency(mrpPaise)}
              </span>
            )}
          </div>
          {discount !== null && (
            <span className="flex items-center gap-1 text-[0.625rem] leading-4 font-medium text-brand-blue-300">
              <Image src="/icons/offer.svg" alt="" width={14} height={14} />
              {discount}% off
            </span>
          )}
          <span
            className={cn(
              'mt-auto flex items-center gap-1 px-1 text-[0.625rem] leading-4',
              inStock ? 'text-green-400' : 'text-brand-red-500',
            )}
          >
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
            {inStock ? 'In Stock' : 'Out Of Stock'}
          </span>
          <div className="flex gap-[0.4375rem]">
            <AddToCartButton
              productId={productId}
              buyNow
              disabled={!inStock}
              variant="blue"
              className="min-w-0 flex-1 px-2 text-[0.75rem] font-normal"
            >
              Buy Now
            </AddToCartButton>
            <AddToCartButton
              productId={productId}
              disabled={!inStock}
              variant="red"
              size="icon"
              aria-label={`Add ${label} to cart`}
              className="size-10 bg-brand-red-400"
            >
              <ShoppingCart className="size-5" strokeWidth={1.5} />
            </AddToCartButton>
          </div>
        </div>
      </article>
    </>
  )
}
