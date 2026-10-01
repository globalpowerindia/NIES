import config from '@payload-config'
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
