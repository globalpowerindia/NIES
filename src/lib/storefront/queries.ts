import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

export const getPayloadClient = cache(() => getPayload({ config }))

/** Published homepage only. Drafts stay in the admin until someone presses Publish. */
export const getHomePage = cache(async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'home-page', depth: 2, draft: false })
})

export const getSiteSettings = cache(async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'site-settings', depth: 2 })
})
