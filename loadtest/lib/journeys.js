// Shopper journeys shared by the load tests. Each request is tagged with its
// journey, so thresholds judge search and cart on their own and a fast
// homepage can't hide a slow cart.
import http from 'k6/http'
import { check, fail, sleep } from 'k6'

export const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '')

/**
 * LIVE_READONLY=yes allows the live store for a browsing-only test at a quiet
 * hour: no cart writes, and at most LIVE_MAX_USERS shoppers.
 */
export const LIVE_READONLY = __ENV.LIVE_READONLY === 'yes'
export const LIVE_MAX_USERS = 1000

const LIVE_HOSTS = ['toolshypermarket.com', 'www.toolshypermarket.com', 'new.toolshypermarket.com', 'nies-nies.vercel.app']
export const isLive = () => LIVE_HOSTS.includes(BASE_URL.replace(/^https?:\/\//, '').split('/')[0])

/** Staging by default. The live store only in read-only mode, never with carts or a surge. */
export const assertStaging = ({ allowLiveReadonly = false } = {}) => {
  if (!BASE_URL) fail('Set BASE_URL to the staging site, e.g. -e BASE_URL=https://staging.example.com')
  if (!isLive()) return
  if (!(allowLiveReadonly && LIVE_READONLY)) {
    fail(`${BASE_URL} is the live store. Use staging, or LIVE_READONLY=yes with browse.js at a quiet hour.`)
  }
}

const env = (name, fallback) => (__ENV[name] ? __ENV[name].split(',').map((s) => s.trim()).filter(Boolean) : fallback)

export const SEARCH_TERMS = env('SEARCH_TERMS', ['drill', 'grinder', 'pressure washer', 'GPG', 'welding', 'compressor', 'cutter'])
/** Product ids that are on sale, priced and in stock on staging: the only ones a cart accepts. */
export const CART_PRODUCT_IDS = env('CART_PRODUCT_IDS', []).map(Number)
/** The promoted product many shoppers open at once. */
export const HOT_PRODUCT = __ENV.HOT_PRODUCT || ''
export const HOT_PRODUCT_ID = Number(__ENV.HOT_PRODUCT_ID || 0)

const pick = (list) => list[Math.floor(Math.random() * list.length)]
/** Reading time between pages, in seconds. */
export const think = (min = 3, max = 10) => sleep(min + Math.random() * (max - min))

const page = (path, journey, expectText) => {
  const res = http.get(`${BASE_URL}${path}`, { tags: { journey }, redirects: 3 })
  const ok = check(res, {
    [`${journey}: 200`]: (r) => r.status === 200,
    [`${journey}: right page`]: (r) => !expectText || (r.body || '').includes(expectText),
  }, { journey })
  return { res, ok }
}

/** Product links found on a listing page, so tests open real products. */
export const productLinks = (html) => {
  const found = new Set()
  const re = /href="(\/products\/[a-z0-9-]+)"/g
  let m
  while ((m = re.exec(html || '')) && found.size < 50) found.add(m[1])
  return [...found]
}

/** Category links on the catalogue page: it lists categories, and products sit one level down. */
export const categoryLinks = (html) => {
  const found = new Set()
  const re = /href="(\/category\/[a-z0-9-]+)"/g
  let m
  while ((m = re.exec(html || '')) && found.size < 50) found.add(m[1])
  return [...found]
}

/**
 * HOST_IP pins the site's hostname to a server address, for when the load
 * generator's DNS still points somewhere else (e.g. just after a DNS move).
 */
export const hostsOption = () => {
  if (!__ENV.HOST_IP) return undefined
  return { [BASE_URL.replace(/^https?:\/\//, '').split('/')[0]]: __ENV.HOST_IP }
}

export const home = () => page('/', 'home')
export const category = (path) => page(path, 'category')
export const catalogue = () => page('/catalogue', 'catalogue')
export const search = () => {
  const term = pick(SEARCH_TERMS)
  return page(`/search?q=${encodeURIComponent(term)}`, 'search')
}
export const product = (path) => page(path, 'product')

/** Adds one unit and checks the cart really holds it, not just a 200. */
export const addToCart = (productId) => {
  const res = http.post(`${BASE_URL}/api/cart/items`, JSON.stringify({ productId, quantity: 1 }), {
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, Referer: `${BASE_URL}/` },
    tags: { journey: 'cart' },
  })
  let body = null
  try {
    body = res.json()
  } catch (_) {
    body = null
  }
  const cart = (body && (body.cart || (body.data && body.data.cart))) || null
  const line = cart && Array.isArray(cart.lines) ? cart.lines.find((l) => l.productId === productId) : null
  return check(res, {
    'cart: 200': (r) => r.status === 200,
    'cart: not rate limited': (r) => r.status !== 429,
    // An HTTP 200 alone can hide a failed add: the product must be in the cart and buyable.
    'cart: holds the product': () => Boolean(line && line.quantity >= 1 && line.status === 'OK'),
  }, { journey: 'cart' })
}

/** One browsing session: the mix comes from the busiest hour of analytics. Tune the weights. */
export const browseSession = (links) => {
  home()
  think()
  const roll = Math.random()
  if (roll < 0.45) {
    // Catalogue → a category → a product, as a shopper browsing by type would.
    const { res } = catalogue()
    think()
    const cats = categoryLinks(res.body)
    if (cats.length) {
      const listing = category(pick(cats))
      think()
      const found = productLinks(listing.res.body)
      if (found.length) product(pick(found))
    }
  } else if (roll < 0.85) {
    const { res } = search()
    think()
    const found = productLinks(res.body)
    if (found.length) product(pick(found))
  } else if (links.length) {
    product(pick(links))
  }
  think()
  // About 1 in 10 sessions adds to cart. Never on the live store.
  if (!isLive() && CART_PRODUCT_IDS.length && Math.random() < 0.1) addToCart(pick(CART_PRODUCT_IDS))
}

/** Per-journey targets: 95% within 2 s, under 0.5% failed checks. Abort a stage that fails. */
export const thresholds = (abort) => {
  const t = {}
  for (const j of ['home', 'catalogue', 'category', 'search', 'product', 'cart']) {
    t[`http_req_duration{journey:${j}}`] = [{ threshold: 'p(95)<2000', abortOnFail: abort, delayAbortEval: '1m' }]
    t[`checks{journey:${j}}`] = [{ threshold: 'rate>0.995', abortOnFail: abort, delayAbortEval: '1m' }]
  }
  // Shows whether the generator itself kept up with the requested load.
  t.dropped_iterations = ['count<1']
  return t
}
