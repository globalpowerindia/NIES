import { SELLER_STATE_CODE } from '@/lib/money'

/**
 * Delivery is charged by parcel weight, from a slab table staff edit in
 * Delivery & Checkout. Each slab has one price inside the seller's state
 * (Kerala) and one for everywhere else. A parcel heavier than the last slab
 * pays the last slab plus a per-kg rate for every started kilogram above it.
 *
 * Fees are GST inclusive, like product prices, so checkout extracts the tax
 * the same way (see `computeCartTotals`).
 */

export type ShippingSlab = {
  /** The heaviest parcel, in grams, this slab covers. */
  maxWeightGrams: number
  withinStatePaise: number
  otherStatesPaise: number
}

export type ShippingRates = {
  slabs: ShippingSlab[]
  extraPerKgWithinStatePaise: number
  extraPerKgOtherStatesPaise: number
  /** Used for any variant whose weight hasn't been entered yet. */
  defaultWeightGrams: number
}

export type WeighedLine = { weightGrams: number | null | undefined; quantity: number }

/** The parcel's weight. A variant without a weight counts at the default. */
export const parcelWeightGrams = (lines: WeighedLine[], defaultWeightGrams: number): number =>
  lines.reduce((sum, line) => {
    const weight = line.weightGrams && line.weightGrams > 0 ? line.weightGrams : defaultWeightGrams
    return sum + weight * line.quantity
  }, 0)

export const shippingFeePaise = (rates: ShippingRates, weightGrams: number, shipStateCode: string): number => {
  const slabs = [...rates.slabs].sort((a, b) => a.maxWeightGrams - b.maxWeightGrams)
  if (slabs.length === 0) return 0
  const withinState = shipStateCode === SELLER_STATE_CODE
  const price = (slab: ShippingSlab) => (withinState ? slab.withinStatePaise : slab.otherStatesPaise)

  const slab = slabs.find((candidate) => weightGrams <= candidate.maxWeightGrams)
  if (slab) return price(slab)

  const heaviest = slabs[slabs.length - 1]
  const extraKg = Math.ceil((weightGrams - heaviest.maxWeightGrams) / 1000)
  const perKg = withinState ? rates.extraPerKgWithinStatePaise : rates.extraPerKgOtherStatesPaise
  return price(heaviest) + extraKg * perKg
}
