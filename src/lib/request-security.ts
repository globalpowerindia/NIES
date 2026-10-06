import { NextResponse } from 'next/server'

import { rateLimit, type RateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'
import { getPayloadClient } from '@/lib/storefront/queries'

/** Cookie mutations must originate from this application, including on sibling subdomains. */
export const mutationGuard = (request: Request): NextResponse | null => {
  const origin = request.headers.get('origin')
  const expected = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  if (!origin || origin !== new URL(expected).origin) {
    return NextResponse.json({ ok: false, error: 'Request origin is not permitted.' }, { status: 403 })
  }
  return null
}

/** The origin check, then a per-IP limit named by `bucket` and shared across every server instance. */
export const guardMutation = async (request: Request, bucket: string, limit: RateLimit): Promise<NextResponse | null> => {
  const denied = mutationGuard(request)
  if (denied) return denied
  const result = await rateLimit(await getPayloadClient(), `${bucket}:ip:${clientIp(request)}`, limit)
  if (result.ok) return null
  return NextResponse.json(
    { ok: false, error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds), 'Cache-Control': 'private, no-store' } },
  )
}
