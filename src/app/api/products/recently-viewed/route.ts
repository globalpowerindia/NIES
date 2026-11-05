import { NextResponse } from 'next/server'

import { LIMITS } from '@/lib/rate-limit'
import { RECENTLY_VIEWED_LIMIT } from '@/lib/recently-viewed'
import { guardRead } from '@/lib/request-security'
import { getCardsInOrder } from '@/lib/storefront/products'
import { getPayloadClient } from '@/lib/storefront/queries'

/** Current cards for the ids a shopper's browser remembers. Not cached: these show prices and stock. */
export const GET = async (request: Request): Promise<NextResponse> => {
  const denied = await guardRead(request, 'recentlyViewed', LIMITS.publicRead)
  if (denied) return denied

  const ids = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .slice(0, RECENTLY_VIEWED_LIMIT)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)

  const products = await getCardsInOrder(await getPayloadClient(), [...new Set(ids)])

  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'private, no-store' } })
}
