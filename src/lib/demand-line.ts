/** Below this a line reads as "hardly anyone wants this", so it isn't shown. */
export const DEMAND_MINIMUM = 5

/** Sales made outside the site, entered by staff from their records. */
export type PastSales = { units: number; since: number | null }

export type DemandCounts = { past?: PastSales } & (
  | { kind: 'sold'; last24Hours: number; last7Days: number; last30Days: number; allTime: number; viewsLast7Days: number }
  | { kind: 'enquiries'; last7Days: number; viewsLast7Days: number }
)

/** Only ever rounds down. */
const roundedDown = (count: number) => {
  if (count < 10) return String(count)
  const step = count < 1000 ? 10 : 100
  return `${(Math.floor(count / step) * step).toLocaleString('en-IN')}+`
}

/** Past sales plus every order on the site, once staff have entered a figure. */
const lifetimeLine = (counts: DemandCounts): string | null => {
  if (!counts.past?.units) return null
  const total = counts.past.units + (counts.kind === 'sold' ? counts.allTime : 0)
  if (total < DEMAND_MINIMUM) return null
  return `${roundedDown(total)} sold${counts.past.since ? ` since ${counts.past.since}` : ''}`
}

/**
 * The line under a product's rating, or null when the numbers don't earn one.
 * It shows the strongest signal the product has reached: sales or enquiries
 * first, then views, so a product with few sales can still show real interest.
 *
 * Every figure is a true count: a rounded one only ever rounds down, because
 * overstating demand is false urgency under India's dark pattern guidelines.
 * Never pad, randomise or invent these.
 */
export const demandLine = (counts: DemandCounts): string | null => {
  if (counts.kind === 'sold' && counts.last24Hours >= DEMAND_MINIMUM) return `${counts.last24Hours} sold in the last 24 hours`
  const lifetime = lifetimeLine(counts)
  if (lifetime) return lifetime
  if (counts.kind === 'enquiries') {
    if (counts.last7Days >= DEMAND_MINIMUM) return `${counts.last7Days} enquiries in the last 7 days`
  } else {
    if (counts.last7Days >= DEMAND_MINIMUM) return `${roundedDown(counts.last7Days)} sold in the last 7 days`
    if (counts.last30Days >= DEMAND_MINIMUM) return `${roundedDown(counts.last30Days)} bought in the past month`
  }
  return counts.viewsLast7Days >= DEMAND_MINIMUM ? `${roundedDown(counts.viewsLast7Days)} views in the last 7 days` : null
}
