import { NextResponse } from 'next/server'

import { loadCompareOptions } from '@/lib/storefront/product-page'

/** Everything a shopper can add to a comparison in one category. */
export const GET = async (request: Request): Promise<NextResponse> => {
  const category = Number(new URL(request.url).searchParams.get('category'))
  if (!Number.isSafeInteger(category) || category <= 0) {
    return NextResponse.json({ error: 'Choose a category.' }, { status: 400 })
  }

  const options = await loadCompareOptions(category)
  return NextResponse.json({ options }, { headers: { 'Cache-Control': 'private, no-store' } })
}
