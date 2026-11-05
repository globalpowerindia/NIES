import { NextResponse } from 'next/server'

import { LIMITS } from '@/lib/rate-limit'
import { guardRead } from '@/lib/request-security'
import { getPayloadClient } from '@/lib/storefront/queries'
import { suggestSearch } from '@/lib/storefront/search'

/**
 * Type-ahead for the header search box. Called on every few keystrokes, so it
 * stays small and is cached briefly at the edge — the catalogue changes far
 * more slowly than people type, and repeated prefixes ("dr", "dri", "dril")
 * are extremely common.
 */
export const GET = async (request: Request): Promise<NextResponse> => {
  const query = new URL(request.url).searchParams.get('q') ?? ''

  if (query.trim().length < 2) return NextResponse.json({ suggestions: [] })

  // Only what the edge cache didn't answer gets here, so this limit is on database work.
  const denied = await guardRead(request, 'searchSuggest', LIMITS.publicRead)
  if (denied) return denied

  const suggestions = await suggestSearch(await getPayloadClient(), query)

  return NextResponse.json(
    { suggestions },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=600' } },
  )
}
