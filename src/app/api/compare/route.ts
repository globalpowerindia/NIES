import { NextResponse } from 'next/server'

import { parseCompareIds } from '@/lib/compare-rules'
import { loadComparison } from '@/lib/storefront/product-page'

/** The comparison for the products a shopper picked. Not cached: it shows prices and stock. */
export const GET = async (request: Request): Promise<NextResponse> => {
  const ids = parseCompareIds(new URL(request.url).searchParams.get('ids'))
  if (ids.length === 0) return NextResponse.json({ error: 'Choose a product to compare.' }, { status: 400 })

  const comparison = await loadComparison(ids)
  return NextResponse.json({ comparison }, { headers: { 'Cache-Control': 'private, no-store' } })
}
