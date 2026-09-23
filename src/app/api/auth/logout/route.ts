import type { NextResponse } from 'next/server'

import { ok } from '@/lib/api-response'
import { endSession } from '@/lib/session'

/**
 * POST rather than GET: a link or an image tag pointing at a GET logout would
 * let any other site sign our customers out.
 */
export const POST = async (): Promise<NextResponse> => {
  await endSession()
  return ok()
}
