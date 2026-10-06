/**
 * The caller's IP, for rate limits. Vercel overwrites `x-real-ip` with the
 * address it actually saw, so a client can't choose its own; `x-forwarded-for`
 * is only a fallback for other hosts, where it is a hint at best. Good enough
 * for throttling, never for granting anything.
 */
export const clientIp = (request: { headers: Headers }): string =>
  request.headers.get('x-real-ip')?.trim() ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown'
