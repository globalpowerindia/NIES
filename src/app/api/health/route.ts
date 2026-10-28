import { sql } from 'drizzle-orm'

import { getPayloadClient } from '@/lib/storefront/queries'

export const dynamic = 'force-dynamic'

const DATABASE_TIMEOUT_MS = 5_000

/**
 * For an uptime monitor: 200 when the site can reach its database, 503 when
 * it can't. Says nothing else, so it is safe to leave public.
 */
export const GET = async (): Promise<Response> => {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const payload = await getPayloadClient()
    await Promise.race([
      payload.db.drizzle.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('database timed out')), DATABASE_TIMEOUT_MS)),
    ])
    return Response.json({ ok: true }, { headers })
  } catch {
    return Response.json({ ok: false }, { status: 503, headers })
  }
}
