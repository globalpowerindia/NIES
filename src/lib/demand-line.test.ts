import { describe, expect, it } from 'vitest'

import { demandLine } from './demand-line'

const sold = (last24Hours: number, last7Days: number, last30Days: number, viewsLast7Days = 0) =>
  demandLine({ kind: 'sold', last24Hours, last7Days, last30Days, allTime: last30Days, viewsLast7Days })
const enquiries = (last7Days: number, viewsLast7Days = 0) => demandLine({ kind: 'enquiries', last7Days, viewsLast7Days })

describe('the demand line on a product page', () => {
  it('shows nothing until a product reaches the minimum', () => {
    expect(sold(0, 0, 0)).toBeNull()
    expect(sold(4, 4, 4, 4)).toBeNull()
    expect(enquiries(4, 4)).toBeNull()
  })

  it('prefers the last day when it has enough sales', () => {
    expect(sold(5, 12, 40)).toBe('5 sold in the last 24 hours')
  })

  it('falls back to the past week when the last day is quiet', () => {
    expect(sold(4, 7, 40)).toBe('7 sold in the last 7 days')
  })

  it('falls back to the past month when the past week is quiet', () => {
    expect(sold(1, 4, 7)).toBe('7 bought in the past month')
  })

  it('only ever rounds a figure down', () => {
    expect(sold(0, 0, 10)).toBe('10+ bought in the past month')
    expect(sold(0, 0, 59)).toBe('50+ bought in the past month')
    expect(sold(0, 19, 59)).toBe('10+ sold in the last 7 days')
    expect(sold(0, 0, 0, 129)).toBe('120+ views in the last 7 days')
  })

  it('counts enquiries for products sold over WhatsApp', () => {
    expect(enquiries(5)).toBe('5 enquiries in the last 7 days')
  })

  it('shows real views when sales and enquiries are too few', () => {
    expect(sold(0, 1, 2, 8)).toBe('8 views in the last 7 days')
    expect(enquiries(2, 34)).toBe('30+ views in the last 7 days')
  })

  it('prefers sales and enquiries to views', () => {
    expect(sold(0, 0, 5, 500)).toBe('5 bought in the past month')
    expect(enquiries(5, 500)).toBe('5 enquiries in the last 7 days')
  })

  describe('with past sales entered by staff', () => {
    const withPast = (units: number, since: number | null, allTime = 0) =>
      demandLine({ kind: 'sold', last24Hours: 0, last7Days: 0, last30Days: 0, allTime, viewsLast7Days: 0, past: { units, since } })

    it('adds online orders to the past figure', () => {
      expect(withPast(1200, 2019, 45)).toBe('1,200+ sold since 2019')
      expect(withPast(1160, 2019, 45)).toBe('1,200+ sold since 2019')
    })

    it('rounds down, and leaves the year out when there is none', () => {
      expect(withPast(1299, null)).toBe('1,200+ sold')
      expect(withPast(345, 2020)).toBe('340+ sold since 2020')
    })

    it('shows nothing for a blank or very small figure', () => {
      expect(withPast(0, 2019)).toBeNull()
      expect(withPast(3, 2019)).toBeNull()
    })

    it('counts for enquiry-only products too', () => {
      expect(demandLine({ kind: 'enquiries', last7Days: 9, viewsLast7Days: 50, past: { units: 500, since: 2018 } })).toBe('500+ sold since 2018')
    })

    it('still prefers a busy last day', () => {
      expect(demandLine({ kind: 'sold', last24Hours: 6, last7Days: 6, last30Days: 6, allTime: 6, viewsLast7Days: 0, past: { units: 500, since: 2018 } })).toBe('6 sold in the last 24 hours')
    })
  })
})
