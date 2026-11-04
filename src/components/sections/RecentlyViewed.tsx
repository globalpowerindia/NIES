'use client'

import { useEffect, useState } from 'react'

import type { ProductCardProps } from '@/components/product/ProductCard'
import { ProductCarousel } from '@/components/sections/ProductCarousel'
import { addRecentlyViewed, readRecentlyViewed } from '@/lib/recently-viewed'

/** Put on a product page, to add it to the shopper's list. */
export const TrackRecentlyViewed = ({ productId }: { productId: number }) => {
  useEffect(() => addRecentlyViewed(productId), [productId])
  return null
}

/** The homepage's row of what this shopper last looked at. Nothing at all on a first visit. */
export const RecentlyViewed = () => {
  const [products, setProducts] = useState<ProductCardProps[]>([])

  useEffect(() => {
    const ids = readRecentlyViewed()
    if (ids.length === 0) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(`/api/products/recently-viewed?ids=${ids.join(',')}`, { signal: controller.signal })
        if (!response.ok) return
        const data: { products?: ProductCardProps[] } = await response.json()
        setProducts(data.products ?? [])
      } catch {
        // Aborted or offline: the homepage just goes without this row.
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  return products.length > 0 ? (
    <ProductCarousel title="Recently Viewed" description="Pick up where you left off" products={products} />
  ) : null
}
