import { describe, expect, it } from 'vitest'

import { demandLine } from './demand-line'

const sold = (last24Hours: number, last30Days: number) => demandLine({ kind: 'sold', last24Hours, last30Days })
const enquiries = (last7Days: number) => demandLine({ kind: 'enquiries', last7Days })

describe('the demand line on a product page', () => {
  it('shows nothing until a product reaches the minimum', () => {
    expect(sold(0, 0)).toBeNull()
    expect(sold(4, 4)).toBeNull()
    expect(enquiries(4)).toBeNull()
  })

  it('prefers the last day when it has enough sales', () => {
    expect(sold(5, 40)).toBe('5 sold in the last 24 hours')
  })

  it('falls back to the past month when the last day is quiet', () => {
    expect(sold(4, 7)).toBe('7 bought in the past month')
  })

  it('only ever rounds a monthly figure down', () => {
    expect(sold(0, 10)).toBe('10+ bought in the past month')
    expect(sold(0, 59)).toBe('50+ bought in the past month')
  })

  it('counts enquiries for products sold over WhatsApp', () => {
    expect(enquiries(5)).toBe('5 enquiries in the last 7 days')
  })
})
