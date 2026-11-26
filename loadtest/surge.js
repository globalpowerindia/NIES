// A promotion: ARRIVALS new shoppers over SURGE_SECONDS, most of them opening
// the same promoted product. Arrivals don't wait for earlier sessions, so a
// slow store builds a queue instead of quietly lowering the load. A steady
// trickle afterwards shows how long the store takes to recover.
//
//   k6 run -e BASE_URL=https://staging… -e HOT_PRODUCT=/products/<slug> -e HOT_PRODUCT_ID=<id> \
//          -e ARRIVALS=10000 -e SURGE_SECONDS=60 loadtest/surge.js
import { addToCart, assertStaging, HOT_PRODUCT, HOT_PRODUCT_ID, home, product, think, thresholds } from './lib/journeys.js'
import { fail } from 'k6'

const ARRIVALS = Number(__ENV.ARRIVALS || 10000)
const SURGE_SECONDS = Number(__ENV.SURGE_SECONDS || 60)
const RATE = Math.ceil(ARRIVALS / SURGE_SECONDS) // 10,000 over 60 s ≈ 167 a second

export const options = {
  scenarios: {
    surge: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: `${SURGE_SECONDS}s`,
      preAllocatedVUs: Math.min(RATE * 20, 5000),
      maxVUs: Math.min(RATE * 60, 20000),
      exec: 'promoShopper',
    },
    // Ordinary traffic after the surge: its response times should fall back to baseline.
    recovery: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '10m',
      startTime: `${SURGE_SECONDS + 30}s`,
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'promoShopper',
    },
  },
  thresholds: thresholds(false),
}

export const setup = () => {
  assertStaging()
  if (!HOT_PRODUCT || !HOT_PRODUCT_ID) fail('Set HOT_PRODUCT (path) and HOT_PRODUCT_ID (an on-sale, stocked product).')
}

export function promoShopper() {
  // Most arrive on the promoted product from the campaign link; some land on the homepage first.
  if (Math.random() < 0.2) {
    home()
    think(1, 4)
  }
  product(HOT_PRODUCT)
  think(2, 6)
  if (Math.random() < 0.3) addToCart(HOT_PRODUCT_ID)
}
