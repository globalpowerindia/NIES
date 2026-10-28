import type { MetadataRoute } from 'next'
import { unstable_cache } from 'next/cache'

import { CACHE_VERSION, STOREFRONT_CACHE } from '@/lib/revalidate'
import { siteUrl } from '@/lib/site-url'
import { getPayloadClient } from '@/lib/storefront/queries'

// Built per request from the cached lists below, so a product published in
// the admin appears at once (the save purges the storefront tag) instead of
// at the next deploy.
export const dynamic = 'force-dynamic'

type Entry = { path: string; updatedAt?: string | null }

/**
 * Everything a visitor can open: live products, active categories and
 * brands, published pages. The same filters the storefront pages use, so the
 * sitemap never lists a URL that would 404. Drafts, hidden products and
 * account or checkout pages stay out.
 */
const listPublicPaths = unstable_cache(
  async (): Promise<Entry[]> => {
    const payload = await getPayloadClient()
    const query = { pagination: false, depth: 0, select: { slug: true, updatedAt: true } } as const

    const [products, categories, brands, pages] = await Promise.all([
      payload.find({ collection: 'products', where: { status: { equals: 'ACTIVE' } }, ...query }),
      payload.find({ collection: 'categories', where: { isActive: { equals: true } }, ...query }),
      payload.find({ collection: 'brands', where: { isActive: { equals: true } }, ...query }),
      payload.find({ collection: 'pages', where: { isPublished: { equals: true } }, ...query }),
    ])

    return [
      ...products.docs.map((doc) => ({ path: `/products/${doc.slug}`, updatedAt: doc.updatedAt })),
      ...categories.docs.map((doc) => ({ path: `/category/${doc.slug}`, updatedAt: doc.updatedAt })),
      ...brands.docs.map((doc) => ({ path: `/brand/${doc.slug}`, updatedAt: doc.updatedAt })),
      ...pages.docs.map((doc) => ({ path: `/${doc.slug}`, updatedAt: doc.updatedAt })),
    ]
  },
  ['sitemap', CACHE_VERSION],
  STOREFRONT_CACHE,
)

/** Pages that exist in code rather than the admin. */
const FIXED_PATHS = ['/', '/products', '/offers', '/app']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl()
  const entries: Entry[] = [...FIXED_PATHS.map((path) => ({ path })), ...(await listPublicPaths())]
  return entries.map(({ path, updatedAt }) => ({
    url: `${origin}${path === '/' ? '' : path}`,
    ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
  }))
}
