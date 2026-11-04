import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/storefront/queries'
import { productViewersNow } from '@/lib/traffic'

/**
 * The live count on a product page. Public, and only ever a number. Cached
 * briefly at the edge, so a busy product costs one query every 30 seconds
 * rather than one per shopper.
 */
export const GET = async (request: Request): Promise<NextResponse> => {
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ viewers: 0 })

  const viewers = await productViewersNow(await getPayloadClient(), id)

  return NextResponse.json(
    { viewers },
    { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=30' } },
  )
}
