'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import { HoverPrefetchLink } from '@/components/product/HoverPrefetchLink'
import { cardPrice, type ProductCardProps } from '@/components/product/ProductCard'
import { ProductCarousel } from '@/components/sections/ProductCarousel'
import { SectionHeading } from '@/components/sections/SectionHeading'
import { cn } from '@/lib/utils'
import { addRecentlyViewed, readRecentlyViewed } from '@/lib/recently-viewed'

const COMPACT_BELOW = 4

/** Put on a product page, to add it to the shopper's list. */
export const TrackRecentlyViewed = ({ productId }: { productId: number }) => {
  useEffect(() => addRecentlyViewed(productId), [productId])
  return null
}

/** A row of what this shopper last looked at, leaving out the product on show. Nothing at all on a first visit. */
export const RecentlyViewed = ({ excludeId }: { excludeId?: number }) => {
  const [products, setProducts] = useState<ProductCardProps[]>([])

  useEffect(() => {
    const ids = readRecentlyViewed().filter((id) => id !== excludeId)
    if (ids.length === 0) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(`/api/products/recently-viewed?ids=${ids.join(',')}`, { signal: controller.signal })
        if (!response.ok) return
        const data: { products?: ProductCardProps[] } = await response.json()
        setProducts(data.products ?? [])
      } catch {
        // Aborted or offline: the page just goes without this row.
      }
    }
    void load()
    return () => controller.abort()
  }, [excludeId])

  if (products.length === 0) return null

  // Too few for a row of full cards: small ones that share the width leave no gap.
  if (products.length < COMPACT_BELOW) {
    return (
      <section className="flex flex-col gap-4">
        <SectionHeading title="Recently Viewed" />
        {/* Two or three share the width; a single card stays card-sized rather than stretching across the page. */}
        <ul className={cn('grid gap-3', products.length === 1 ? 'sm:max-w-[26rem]' : 'sm:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]')}>
          {products.map((product) => (
            <li key={product.href}>
              <HoverPrefetchLink
                href={product.href}
                className="card-lift flex items-center gap-3 rounded-xl bg-light-100 p-2 ring-[0.5px] ring-brand-blue-200 ring-inset"
              >
                <span className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-200 md:size-24">
                  <Image src={product.imageUrl} alt="" fill sizes="192px" className="object-contain p-1" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-body2 text-dark-500">{product.label}</span>
                  <span className="text-label1 font-semibold text-dark-500">{cardPrice(product.pricePaise)}</span>
                </span>
              </HoverPrefetchLink>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return <ProductCarousel title="Recently Viewed" products={products} />
}
