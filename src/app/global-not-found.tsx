import type { Metadata } from 'next'

import { NotFoundView } from '@/components/layout/NotFoundView'
import { StorefrontDocument } from '@/components/layout/StorefrontDocument'

import './(frontend)/styles.css'

export const metadata: Metadata = { title: 'Page not found' }

/**
 * A URL that matches no route at all. The storefront and the admin each have
 * their own root layout, so there is no single layout for Next to wrap a 404
 * in; this renders the storefront document itself. `/admin/*` never gets here:
 * Payload's catch-all answers those.
 */
export default function GlobalNotFound() {
  return (
    <StorefrontDocument>
      <NotFoundView />
    </StorefrontDocument>
  )
}
