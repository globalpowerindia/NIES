import { NextResponse } from 'next/server'

import { can } from '@/access/permissions'
import { getPayloadClient } from '@/lib/storefront/queries'
import { loadLiveVisitors } from '@/lib/traffic'

/** The admin dashboard's live count. Staff with the "Sales analytics" permission only. */
export const GET = async (request: Request): Promise<NextResponse> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  if (!can(user, 'reports', 'read')) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json(await loadLiveVisitors(payload), { headers: { 'Cache-Control': 'private, no-store' } })
}
