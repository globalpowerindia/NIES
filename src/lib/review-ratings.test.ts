import { describe, expect, it } from 'vitest'
import { summarizeReviewRatings } from './review-ratings'

describe('rating summary', () => {
  it('shows empty bars without reviews', () => {
    const summary = summarizeReviewRatings([])
    expect(summary.count).toBe(0)
    expect(summary.average).toBe(0)
    expect(summary.distribution.map(row => row.percent)).toEqual([0, 0, 0, 0, 0])
  })
  it('calculates average, counts and percentages from the same reviews', () => {
    const summary = summarizeReviewRatings([5, 5, 4, 1].map(rating => ({ rating })))
    expect(summary.count).toBe(4)
    expect(summary.average).toBe(3.75)
    expect(summary.distribution.map(row => row.percent)).toEqual([50, 25, 0, 0, 25])
  })
  it('uses all ratings, including those beyond the eight displayed cards', () => {
    const summary = summarizeReviewRatings([...Array(9).fill({ rating: 5 }), { rating: 1 }])
    expect(summary.count).toBe(10)
    expect(summary.distribution[0].percent).toBe(90)
  })
  it('excludes invalid legacy ratings from all summary values', () => {
    const summary = summarizeReviewRatings([0, 6, 2.5, NaN, 4].map(rating => ({ rating })))
    expect(summary.count).toBe(1)
    expect(summary.average).toBe(4)
    expect(summary.distribution[1].percent).toBe(100)
  })
})
