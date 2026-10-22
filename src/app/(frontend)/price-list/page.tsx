import type { Metadata } from 'next'

import { DownloadPage } from '@/components/layout/DownloadPage'

export const metadata: Metadata = { title: 'Price List' }

export default function PriceList() {
  return <DownloadPage file="priceListFile" title="Price List" />
}
