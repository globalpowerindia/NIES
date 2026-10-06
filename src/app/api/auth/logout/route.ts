import { mutationGuard } from '@/lib/request-security'
import type { NextResponse } from 'next/server'

import { ok } from '@/lib/api-response'
import { revokeAllSessions } from '@/lib/customer-sessions'
import { endSession, getSessionClaims } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'

/**
 * POST rather than GET: a link or an image tag pointing at a GET logout would
 * let any other site sign our customers out. `?scope=all` signs the customer
 * out on every device, e.g. after losing a phone.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = mutationGuard(request)
  if (denied) return denied
  const claims = await getSessionClaims()
  if (claims && new URL(request.url).searchParams.get('scope') === 'all') {
    await revokeAllSessions(await getPayloadClient(), claims.customerId)
  }
  await endSession()
  return ok()
}
