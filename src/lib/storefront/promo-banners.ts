import { unstable_cache } from 'next/cache'

import type { PromoPageType } from '@/collections/PromoBanners'
import { relIds } from '@/lib/relations'
import { CACHE_VERSION, STOREFRONT_CACHE } from '@/lib/revalidate'
import { getCategoryTree } from '@/lib/storefront/catalog'
import { mediaOf, type MediaInfo } from '@/lib/storefront/content'
import { getPayloadClient } from '@/lib/storefront/queries'

export type PromoBannerItem = { image: MediaInfo; mobileImage: MediaInfo | null; href: string | null }

/** One row of one to three banners, shown side by side. */
export type PromoBannerData = {
  id: number
  items: PromoBannerItem[]
  position: 'top' | 'inline'
  afterProducts: number
}

/** The page a banner is being chosen for. */
export type PromoTarget =
  | { kind: 'category'; categoryId: number }
  | { kind: 'brand'; brandId: number }
  | { kind: 'search'; query: string }
  | { kind: 'product'; productId: number; categoryId: number | null; brandId: number | null }

type StoredBanner = PromoBannerData & {
  showOn: PromoPageType[]
  categoryIds: number[]
  brandIds: number[]
  productIds: number[]
  searchWords: string[]
  startsAt: string | null
  endsAt: string | null
}

/** Every active banner, in display order. Dates are checked per request, since the cache lasts an hour. */
const loadPromoBanners = unstable_cache(
  async (): Promise<StoredBanner[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'promo-banners',
      where: { isActive: { equals: true } },
      sort: ['sortOrder', '-updatedAt'],
      pagination: false,
      depth: 1,
      // Only the images need their documents; the limits are compared by id.
      populate: { categories: { slug: true }, brands: { slug: true }, products: { slug: true } },
      select: {
        banners: true,
        showOn: true,
        categories: true,
        brands: true,
        products: true,
        searchWords: true,
        position: true,
        afterProducts: true,
        startsAt: true,
        endsAt: true,
      },
    })
    return docs.flatMap<StoredBanner>((doc) => {
      const items = (doc.banners ?? []).flatMap<PromoBannerItem>((banner) => {
        const image = mediaOf(banner.image)
        return image ? [{ image, mobileImage: mediaOf(banner.mobileImage), href: banner.link?.trim() || null }] : []
      })
      if (items.length === 0) return []
      return [
        {
          id: doc.id,
          items,
          position: doc.position === 'inline' ? 'inline' : 'top',
          afterProducts: Math.max(1, Math.floor(doc.afterProducts ?? 12)),
          showOn: (doc.showOn ?? []) as PromoPageType[],
          categoryIds: relIds(doc.categories),
          brandIds: relIds(doc.brands),
          productIds: relIds(doc.products),
          searchWords: (doc.searchWords ?? '')
            .split(',')
            .map((word) => word.trim().toLowerCase())
            .filter(Boolean),
          startsAt: doc.startsAt ?? null,
          endsAt: doc.endsAt ?? null,
        },
      ]
    })
  },
  ['promo-banner-rows', CACHE_VERSION],
  STOREFRONT_CACHE,
)

/** The banners for one page, in display order. */
export const getPromoBanners = async (target: PromoTarget): Promise<PromoBannerData[]> => {
  const [banners, tree] = await Promise.all([loadPromoBanners(), getCategoryTree()])
  const now = Date.now()

  /** A category is in scope when it is, or sits under, one the banner names. */
  const inCategories = (banner: StoredBanner, categoryId: number | null) =>
    banner.categoryIds.length === 0 ||
    (categoryId !== null && banner.categoryIds.some((id) => tree.descendantIds(id).includes(categoryId)))
  const inBrands = (banner: StoredBanner, brandId: number | null) =>
    banner.brandIds.length === 0 || (brandId !== null && banner.brandIds.includes(brandId))

  const matches = (banner: StoredBanner): boolean => {
    if (!banner.showOn.includes(target.kind)) return false
    switch (target.kind) {
      case 'category':
        return inCategories(banner, target.categoryId)
      case 'brand':
        return inBrands(banner, target.brandId)
      case 'search': {
        const query = target.query.toLowerCase()
        return banner.searchWords.length === 0 || banner.searchWords.some((word) => query.includes(word))
      }
      case 'product':
        return (
          (banner.productIds.length === 0 || banner.productIds.includes(target.productId)) &&
          inCategories(banner, target.categoryId) &&
          inBrands(banner, target.brandId)
        )
    }
  }

  return banners
    .filter(
      (banner) =>
        (!banner.startsAt || Date.parse(banner.startsAt) <= now) &&
        (!banner.endsAt || Date.parse(banner.endsAt) > now) &&
        matches(banner),
    )
    .map(({ id, items, position, afterProducts }) => ({ id, items, position, afterProducts }))
}
