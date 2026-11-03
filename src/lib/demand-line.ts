/** Below this a line reads as "hardly anyone wants this", so it isn't shown. */
export const DEMAND_MINIMUM = 5

export type DemandCounts =
  | { kind: 'sold'; last24Hours: number; last30Days: number }
  | { kind: 'enquiries'; last7Days: number }

/**
 * The line under a product's rating, or null when the numbers don't earn one.
 * Every figure is a true count: a rounded one only ever rounds down, because
 * overstating demand is false urgency under India's dark pattern guidelines.
 */
export const demandLine = (counts: DemandCounts): string | null => {
  if (counts.kind === 'enquiries') {
    return counts.last7Days >= DEMAND_MINIMUM ? `${counts.last7Days} enquiries in the last 7 days` : null
  }
  if (counts.last24Hours >= DEMAND_MINIMUM) return `${counts.last24Hours} sold in the last 24 hours`
  if (counts.last30Days < DEMAND_MINIMUM) return null
  if (counts.last30Days < 10) return `${counts.last30Days} bought in the past month`
  return `${Math.floor(counts.last30Days / 10) * 10}+ bought in the past month`
}
