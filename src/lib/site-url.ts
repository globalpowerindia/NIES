/**
 * The storefront's public origin, for links that leave the site and come back:
 * email links and the OAuth redirect. Taken from config rather than the
 * request's Host header, which the client controls.
 */
export const siteUrl = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
