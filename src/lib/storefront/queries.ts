import config from '@payload-config'
import { sql } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import { cache } from 'react'

import { CACHE_VERSION, STOREFRONT_CACHE } from '@/lib/revalidate'

export const getPayloadClient = cache(() => getPayload({ config }))

/** Published homepage only. Drafts stay in the admin until someone presses Publish. */
export const getHomePage = cache(async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'home-page', depth: 2, draft: false })
})

/** Header and footer, read by every page. Cached until Header & Footer is saved. */
export const getSiteSettings = cache(
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      return payload.findGlobal({ slug: 'site-settings', depth: 2 })
    },
    ['site-settings', CACHE_VERSION],
    STOREFRONT_CACHE,
  ),
)

/** Random live product names for the search box. A fresh draw each time the cache refreshes. */
const loadSearchHints = unstable_cache(
  async (): Promise<string[]> => {
    const payload = await getPayloadClient()
    const result = await payload.db.drizzle.execute(sql`
      SELECT name FROM products WHERE status = 'ACTIVE' ORDER BY random() LIMIT 20
    `)
    const rows = (Array.isArray(result) ? result : (result.rows ?? [])) as { name: string }[]
    return rows.map((row) => row.name)
  },
  ['search-hints', CACHE_VERSION],
  STOREFRONT_CACHE,
)

/** Caught outside the cache, so a failed read is retried rather than remembered for an hour. */
export const getSearchHints = cache(async (): Promise<string[]> => {
  try {
    return await loadSearchHints()
  } catch (err) {
    // A nice-to-have: this runs on every page, and the box has a default hint.
    const payload = await getPayloadClient()
    payload.logger.error({ err }, 'Could not read search hints')
    return []
  }
})
