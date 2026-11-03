import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site-url'

/**
 * Crawl the catalogue; skip what is private, per-visitor or endless. Search
 * results and sign-in pages are left out because every query or `next=`
 * makes a new URL with nothing worth indexing. Product listings stay
 * crawlable, filters and all; canonical tags on them are still to come.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/account', '/cart', '/checkout', '/login', '/register', '/search'],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
