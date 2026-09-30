/**
 * The caller's IP, for rate limits. On Vercel the platform sets
 * `x-forwarded-for` itself, with the client first; elsewhere it is a hint at
 * best, which is acceptable for throttling but must never be used to grant
 * anything.
 */
export const clientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip')?.trim() ||
  'unknown'
