import { describe, expect, it } from 'vitest'

import { bucketKeys, change, fillSeries, isRangeKey, resolveRange } from './analytics'

// 25 Oct 2026, 02:00 in India — still the 24th in UTC.
const now = new Date('2026-10-24T20:30:00Z')

describe('resolveRange', () => {
  it('starts day ranges at midnight IST and includes today', () => {
    const range = resolveRange('7d', now)
    expect(range.start.toISOString()).toBe('2026-10-18T18:30:00.000Z') // 19 Oct, 00:00 IST
    expect(range.end).toBe(now)
    expect(bucketKeys(range)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
  })

  it('compares with a window of the same length just before', () => {
    const range = resolveRange('30d', now)
    expect(range.start.getTime() - range.prevStart.getTime()).toBe(range.end.getTime() - range.start.getTime())
    expect(bucketKeys(range)).toHaveLength(30)
  })

  it('covers twelve calendar months, across the year boundary', () => {
    const range = resolveRange('12m', now)
    expect(range.start.toISOString()).toBe('2025-10-31T18:30:00.000Z') // 1 Nov 2025, 00:00 IST
    const keys = bucketKeys(range)
    expect(keys).toHaveLength(12)
    expect(keys[0]).toBe('2025-11')
    expect(keys.at(-1)).toBe('2026-10')
  })
})

describe('fillSeries', () => {
  it('puts a zero in every bucket without sales', () => {
    expect(fillSeries(['a', 'b', 'c'], [{ key: 'b', revenuePaise: 500, orders: 1 }])).toEqual([
      { key: 'a', revenuePaise: 0, orders: 0 },
      { key: 'b', revenuePaise: 500, orders: 1 },
      { key: 'c', revenuePaise: 0, orders: 0 },
    ])
  })
})

describe('change', () => {
  it('is a fraction of the previous period, or null with nothing to compare', () => {
    expect(change(150, 100)).toBe(0.5)
    expect(change(50, 100)).toBe(-0.5)
    expect(change(10, 0)).toBeNull()
  })
})

describe('isRangeKey', () => {
  it('accepts only known ranges', () => {
    expect(isRangeKey('90d')).toBe(true)
    expect(isRangeKey('1d')).toBe(false)
    expect(isRangeKey(undefined)).toBe(false)
    expect(isRangeKey('toString')).toBe(false)
    expect(isRangeKey('constructor')).toBe(false)
  })
})
