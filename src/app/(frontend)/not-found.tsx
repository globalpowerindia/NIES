import type { Metadata } from 'next'

import { NotFoundView } from '@/components/layout/NotFoundView'

export const metadata: Metadata = { title: 'Page not found' }

/** Shown when a storefront page calls `notFound()`: a missing product, category, brand or CMS page. */
export default function NotFound() {
  return <NotFoundView />
}
