/** Classifying a visit. Free of server code, so it can be tested on its own. */

export type Device = 'phone' | 'tablet' | 'desktop'

/** Most crawlers never run the tracker at all; this catches the ones that do. */
export const isBot = (userAgent: string): boolean =>
  !userAgent || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit/i.test(userAgent)

export const deviceOf = (userAgent: string): Device => {
  if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) return 'tablet'
  return /mobi|iphone|android/i.test(userAgent) ? 'phone' : 'desktop'
}

const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\./, 'Bing'],
  [/(^|\.)yahoo\./, 'Yahoo'],
  [/(^|\.)duckduckgo\./, 'DuckDuckGo'],
  [/(^|\.)(facebook|fb)\./, 'Facebook'],
  [/(^|\.)instagram\./, 'Instagram'],
  [/(^|\.)(youtube\.|youtu\.be$)/, 'YouTube'],
  [/(^|\.)(whatsapp\.|wa\.me$)/, 'WhatsApp'],
  [/(^|\.)linkedin\./, 'LinkedIn'],
  [/(^|\.)(x\.com$|twitter\.|t\.co$)/, 'X'],
]

const namedSource = (value: string): string | undefined =>
  KNOWN_SOURCES.find(([pattern]) => pattern.test(value))?.[1]

/**
 * Where a visit came from. A campaign's `utm_source` is what its link says on
 * purpose, so it wins over the referrer. Coming from the shop itself (a new
 * tab, say) isn't a source of traffic, so that counts as direct.
 */
export const sourceOf = (referrer: string, utmSource: string, siteHost: string): string => {
  const utm = utmSource.trim().toLowerCase().slice(0, 40)
  if (utm) return namedSource(`${utm}.`) ?? utm

  let host: string
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'Direct'
  }
  if (host === siteHost.toLowerCase().replace(/^www\./, '')) return 'Direct'
  return namedSource(host) ?? host
}

/** The product a storefront path belongs to, if any. */
export const productSlugOf = (path: string): string | null =>
  path.match(/^\/products\/([^/]+)\/?$/)?.[1] ?? null
