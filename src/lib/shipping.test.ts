import { describe, expect, it } from 'vitest'

import { parcelWeightGrams, shippingFeePaise, type ShippingRates } from '@/lib/shipping'

const rates: ShippingRates = {
  slabs: [
    { maxWeightGrams: 5000, withinStatePaise: 14_900, otherStatesPaise: 29_900 },
    { maxWeightGrams: 2000, withinStatePaise: 9_900, otherStatesPaise: 19_900 },
    { maxWeightGrams: 10_000, withinStatePaise: 24_900, otherStatesPaise: 44_900 },
  ],
  extraPerKgWithinStatePaise: 2_000,
  extraPerKgOtherStatesPaise: 3_500,
  defaultWeightGrams: 5000,
}

describe('parcelWeightGrams', () => {
  it('adds each line by quantity', () => {
    expect(parcelWeightGrams([{ weightGrams: 1200, quantity: 2 }, { weightGrams: 300, quantity: 1 }], 5000)).toBe(2700)
  })

  it('counts a variant with no weight at the default', () => {
    expect(parcelWeightGrams([{ weightGrams: null, quantity: 2 }, { weightGrams: 0, quantity: 1 }], 4000)).toBe(12_000)
  })
})

describe('shippingFeePaise', () => {
  it('picks the smallest slab that fits, whatever order staff entered them in', () => {
    expect(shippingFeePaise(rates, 1500, '32')).toBe(9_900)
    expect(shippingFeePaise(rates, 2000, '32')).toBe(9_900)
    expect(shippingFeePaise(rates, 2001, '32')).toBe(14_900)
  })

  it('charges the other-states price outside Kerala', () => {
    expect(shippingFeePaise(rates, 4000, '33')).toBe(29_900)
  })

  it('adds the per-kg rate for every started kilogram above the last slab', () => {
    expect(shippingFeePaise(rates, 10_001, '32')).toBe(24_900 + 2_000)
    expect(shippingFeePaise(rates, 12_500, '29')).toBe(44_900 + 3 * 3_500)
  })

  it('is free when no slabs are set', () => {
    expect(shippingFeePaise({ ...rates, slabs: [] }, 8000, '32')).toBe(0)
  })
})
