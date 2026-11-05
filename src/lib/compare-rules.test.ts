import { describe, expect, it } from 'vitest'

import { compareLink, COMPARE_MAX, parseCompareIds, valuesDiffer } from './compare-rules'

describe('parseCompareIds', () => {
  it('reads ids in order', () => {
    expect(parseCompareIds('12,45,67')).toEqual([12, 45, 67])
  })

  it('drops anything that is not a positive whole number', () => {
    expect(parseCompareIds('1,abc,-2,0,3.5,,4e2, 5 ')).toEqual([1, 5])
    expect(parseCompareIds('99999999999999999999')).toEqual([])
  })

  it('drops repeats and stops at the limit', () => {
    expect(parseCompareIds('1,1,2,3,4,5,6')).toEqual([1, 2, 3, 4])
    expect(parseCompareIds('1,2,3,4,5,6')).toHaveLength(COMPARE_MAX)
  })

  it('copes with nothing at all', () => {
    expect(parseCompareIds(null)).toEqual([])
    expect(parseCompareIds(undefined)).toEqual([])
    expect(parseCompareIds('')).toEqual([])
  })
})

describe('valuesDiffer', () => {
  it('is false when every product has the same value', () => {
    expect(valuesDiffer(['430W', '430W'])).toBe(false)
  })

  it('ignores case and stray spaces', () => {
    expect(valuesDiffer(['Yes', ' yes '])).toBe(false)
  })

  it('is true when any value differs', () => {
    expect(valuesDiffer(['430W', '430W', '810W'])).toBe(true)
  })

  it('treats a missing value as different from a present one', () => {
    expect(valuesDiffer(['430W', undefined])).toBe(true)
    expect(valuesDiffer([undefined, undefined])).toBe(false)
  })
})

describe('compareLink', () => {
  it('builds a shareable address', () => {
    expect(compareLink([12, 45])).toBe('/compare?products=12,45')
  })
})
