import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { isCronRequest } from '@/lib/cron-auth'
import { getPayloadClient } from '@/lib/storefront/queries'

/** A cart with items left untouched this long counts as abandoned. */
const ABANDONED_AFTER_HOURS = 24

/**
 * Hourly (see vercel.json). Flags carts with items that nobody has touched
 * for a day, for the admin's Carts list and, later, reminder emails. The
 * cart stays usable; any change clears the flag.
 */
export const GET = async (request: Request): Promise<NextResponse> => {
  if (!isCronRequest(request)) return NextResponse.json({ ok: false }, { status: 401 })

  const payload = await getPayloadClient()
  const result = await payload.db.drizzle.execute(sql`
    UPDATE carts SET abandoned_at = now()
    WHERE status = 'ACTIVE'
      AND abandoned_at IS NULL
      AND last_activity_at < now() - make_interval(hours => ${ABANDONED_AFTER_HOURS})
      AND EXISTS (SELECT 1 FROM cart_items WHERE cart_items.cart_id = carts.id)
    RETURNING id
  `)
  return NextResponse.json({ ok: true, flagged: result.rows.length })
}
