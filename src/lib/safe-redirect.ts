/**
 * Where to send someone after they sign in, taken from `?next=`.
 *
 * Only same-site paths are allowed. `//evil.com` and `/\evil.com` both start
 * with a slash but browsers treat them as another host, which would turn our
 * login page into a trusted-looking hop to a phishing site.
 */
export const safeNext = (value: unknown, fallback = '/'): string => {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  // Never bounce back onto an auth page — that is where they just were.
  if (/^\/(login|register)(\/|\?|$)/.test(value)) return fallback
  return value
}
