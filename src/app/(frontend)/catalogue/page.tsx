import type { Metadata } from 'next'

import { DownloadPage } from '@/components/layout/DownloadPage'

export const metadata: Metadata = { title: 'Product Catalogue' }

export default function Catalogue() {
  return <DownloadPage file="catalogueFile" title="Product Catalogue" />
}
