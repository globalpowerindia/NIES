// How many shoppers can browse at once. Concurrency steps up through
// 100 → 10,000; each step ramps for 2 minutes and holds for HOLD minutes.
// A step that misses the targets aborts the run, so the last step that
// finished is the sustained capacity.
//
//   k6 run -e BASE_URL=https://staging… -e CART_PRODUCT_IDS=12,34 -e MAX_USERS=1000 loadtest/browse.js
//
// Live store, browsing only, at a quiet hour (no carts, capped at 1,000):
//   k6 run -e BASE_URL=https://toolshypermarket.com -e LIVE_READONLY=yes -e MAX_USERS=1000 -e HOLD=3 loadtest/browse.js
import { assertStaging, BASE_URL, browseSession, hostsOption, isLive, LIVE_MAX_USERS, productLinks, thresholds } from './lib/journeys.js'
import http from 'k6/http'

const maxUsers = Math.min(Number(__ENV.MAX_USERS || 1000), isLive() ? LIVE_MAX_USERS : Infinity)
// The live store starts gentler, so a problem shows at 50 shoppers rather than 100.
const STEPS = (isLive() ? [50, 100, 250, 500, 1000] : [100, 500, 1000, 2500, 5000, 10000]).filter((n) => n <= maxUsers)
const HOLD = `${Number(__ENV.HOLD || 10)}m`

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: STEPS.flatMap((users) => [
        { duration: '2m', target: users },
        { duration: HOLD, target: users },
      ]).concat([{ duration: '2m', target: 0 }]),
      gracefulRampDown: '30s',
    },
  },
  thresholds: thresholds(true),
  hosts: hostsOption(),
}

export const setup = () => {
  assertStaging({ allowLiveReadonly: true })
  // Real product links to open directly, taken from the all-products listing.
  const links = productLinks(http.get(`${BASE_URL}/products`).body)
  if (!links.length) throw new Error('No product links found on /products: check the site is reachable.')
  return { links }
}

export default function (data) {
  browseSession(data.links)
}
