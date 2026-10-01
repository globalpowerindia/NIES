import { timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

/**
 * Scheduled jobs are plain HTTP routes, so anyone could call them. Only a
 * request carrying `Bearer <CRON_SECRET>` (Vercel Cron sends it) gets through,
 * compared in constant time. With no secret configured, nothing does.
 */
export const isCronRequest = (request: Request): boolean => {
  if (!env.CRON_SECRET) return false
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
