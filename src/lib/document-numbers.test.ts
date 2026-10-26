import { describe, expect, it } from 'vitest'

import { financialYearCode } from '@/lib/document-numbers'

describe('financialYearCode', () => {
  it('runs April to March', () => {
    expect(financialYearCode(new Date('2026-04-01T00:00:00+05:30'))).toBe('2627')
    expect(financialYearCode(new Date('2027-03-31T23:59:00+05:30'))).toBe('2627')
    expect(financialYearCode(new Date('2026-03-31T23:59:00+05:30'))).toBe('2526')
  })

  it('turns over at midnight India time, not UTC', () => {
    // 1 April 00:30 IST is still 31 March in UTC.
    expect(financialYearCode(new Date('2026-03-31T19:00:00Z'))).toBe('2627')
  })

  it('wraps the century', () => {
    expect(financialYearCode(new Date('2099-06-01T00:00:00Z'))).toBe('9900')
  })
})
