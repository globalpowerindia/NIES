import { describe, expect, it } from 'vitest'

import {
  allocateDiscount,
  computeCartTotals,
  formatCurrency,
  rupeesToPaise,
  splitInclusive,
  splitJurisdiction,
  SELLER_STATE_CODE,
} from './money'

const KERALA = SELLER_STATE_CODE
const KARNATAKA = '29'

describe('splitInclusive', () => {
  it('extracts 18% GST from a GST-inclusive price', () => {
    expect(splitInclusive(118_000, 1800)).toEqual({ taxablePaise: 100_000, taxPaise: 18_000 })
  })

  it('always reconstructs the net exactly', () => {
    for (const net of [1, 7, 99, 12_345, 999_999]) {
      const { taxablePaise, taxPaise } = splitInclusive(net, 1800)
      expect(taxablePaise + taxPaise).toBe(net)
    }
  })

  it('treats a zero rate as fully taxable', () => {
    expect(splitInclusive(50_000, 0)).toEqual({ taxablePaise: 50_000, taxPaise: 0 })
  })
})

describe('splitJurisdiction', () => {
  it('splits intra-state tax into CGST and SGST', () => {
    expect(splitJurisdiction(18_000, KERALA)).toEqual({
      cgstPaise: 9_000,
      sgstPaise: 9_000,
      igstPaise: 0,
    })
  })

  it('gives the odd paise to SGST rather than losing it', () => {
    const { cgstPaise, sgstPaise } = splitJurisdiction(18_001, KERALA)
    expect(cgstPaise).toBe(9_000)
    expect(sgstPaise).toBe(9_001)
    expect(cgstPaise + sgstPaise).toBe(18_001)
  })

  it('routes inter-state tax entirely to IGST', () => {
    expect(splitJurisdiction(18_000, KARNATAKA)).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 18_000,
    })
  })
})

describe('allocateDiscount', () => {
  it('allocates proportionally when it divides evenly', () => {
    expect(allocateDiscount([10_000, 10_000], 2_000)).toEqual([1_000, 1_000])
  })

  it('distributes indivisible remainders without losing paise', () => {
    const allocated = allocateDiscount([100, 100, 100], 10)
    expect(allocated.reduce((a, b) => a + b, 0)).toBe(10)
    expect(allocated).toEqual([4, 3, 3])
  })

  it('weights allocation by line value', () => {
    const allocated = allocateDiscount([90_000, 10_000], 5_000)
    expect(allocated).toEqual([4_500, 500])
  })

  it('caps the discount at the cart total', () => {
    expect(allocateDiscount([1_000], 5_000)).toEqual([1_000])
  })

  it('returns zeros for an empty or free cart', () => {
    expect(allocateDiscount([0, 0], 500)).toEqual([0, 0])
    expect(allocateDiscount([100], 0)).toEqual([0])
  })
})

describe('computeCartTotals', () => {
  it('puts a coupon only on the lines it covers, so each line keeps its own GST', () => {
    const totals = computeCartTotals({
      lines: [
        { sellingPricePaise: 100_000, quantity: 1, gstRateBps: 1800, discountable: true },
        { sellingPricePaise: 100_000, quantity: 1, gstRateBps: 1200, discountable: false },
      ],
      shipStateCode: '32',
      discountPaise: 10_000,
    })
    expect(totals.lines.map((line) => line.discountPaise)).toEqual([10_000, 0])
    expect(totals.lines[1].netPaise).toBe(100_000)
    expect(totals.grandTotalPaise).toBe(190_000)
  })

  const line = (sellingPricePaise: number, quantity = 1, gstRateBps = 1800) => ({
    sellingPricePaise,
    quantity,
    gstRateBps,
  })

  it('computes an intra-Kerala order', () => {
    const totals = computeCartTotals({
      lines: [line(118_000, 2)],
      shipStateCode: KERALA,
    })

    expect(totals.subtotalPaise).toBe(236_000)
    expect(totals.grandTotalPaise).toBe(236_000)
    expect(totals.taxablePaise).toBe(200_000)
    expect(totals.cgstPaise).toBe(18_000)
    expect(totals.sgstPaise).toBe(18_000)
    expect(totals.igstPaise).toBe(0)
  })

  it('computes an inter-state order as IGST', () => {
    const totals = computeCartTotals({
      lines: [line(118_000)],
      shipStateCode: KARNATAKA,
    })

    expect(totals.igstPaise).toBe(18_000)
    expect(totals.cgstPaise + totals.sgstPaise).toBe(0)
  })

  it('applies a discount before extracting tax', () => {
    const totals = computeCartTotals({
      lines: [line(118_000)],
      shipStateCode: KERALA,
      discountPaise: 11_800,
    })

    expect(totals.discountPaise).toBe(11_800)
    expect(totals.grandTotalPaise).toBe(106_200)
    expect(totals.taxablePaise).toBe(90_000)
    expect(totals.cgstPaise + totals.sgstPaise).toBe(16_200)
  })

  it('taxes shipping and includes it in the grand total', () => {
    const totals = computeCartTotals({
      lines: [line(118_000)],
      shipStateCode: KERALA,
      shippingPaise: 11_800,
    })

    expect(totals.shippingPaise).toBe(11_800)
    expect(totals.grandTotalPaise).toBe(129_800)
    expect(totals.taxablePaise).toBe(110_000)
    expect(totals.cgstPaise + totals.sgstPaise).toBe(19_800)
  })

  it('handles mixed GST rates across lines', () => {
    const totals = computeCartTotals({
      lines: [line(118_000, 1, 1800), line(105_000, 1, 500)],
      shipStateCode: KERALA,
    })

    expect(totals.grandTotalPaise).toBe(223_000)
    expect(totals.taxablePaise).toBe(200_000)
    expect(totals.cgstPaise + totals.sgstPaise).toBe(23_000)
  })

  it('rejects non-integer paise', () => {
    expect(() =>
      computeCartTotals({ lines: [line(100.5)], shipStateCode: KERALA }),
    ).toThrow(/integer in paise/)
  })

  it('rejects a zero quantity', () => {
    expect(() =>
      computeCartTotals({ lines: [line(100, 0)], shipStateCode: KERALA }),
    ).toThrow(/positive integer/)
  })

  it('holds its invariants across fuzzed carts', () => {
    const rates = [0, 500, 1200, 1800, 2800]
    let seed = 20260917

    const next = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % max
    }

    for (let run = 0; run < 500; run++) {
      const lines = Array.from({ length: 1 + next(5) }, () => ({
        sellingPricePaise: 1 + next(500_000),
        quantity: 1 + next(9),
        gstRateBps: rates[next(rates.length)],
      }))

      const subtotal = lines.reduce((sum, l) => sum + l.sellingPricePaise * l.quantity, 0)
      const shipStateCode = next(2) === 0 ? KERALA : KARNATAKA

      const totals = computeCartTotals({
        lines,
        shipStateCode,
        discountPaise: next(subtotal + 1),
        shippingPaise: next(20_000),
      })

      const tax = totals.cgstPaise + totals.sgstPaise + totals.igstPaise

      expect(totals.taxablePaise + tax).toBe(totals.grandTotalPaise)

      expect(totals.lines.reduce((sum, l) => sum + l.netPaise, 0) + totals.shippingPaise).toBe(
        totals.grandTotalPaise,
      )

      expect(totals.discountPaise).toBe(
        totals.lines.reduce((sum, l) => sum + l.discountPaise, 0),
      )

      for (const value of [
        totals.grandTotalPaise,
        totals.taxablePaise,
        totals.cgstPaise,
        totals.sgstPaise,
        totals.igstPaise,
      ]) {
        expect(Number.isSafeInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }

      if (shipStateCode === KERALA) {
        expect(totals.igstPaise).toBe(0)
        expect(Math.abs(totals.cgstPaise - totals.sgstPaise)).toBeLessThanOrEqual(1)
      } else {
        expect(totals.cgstPaise + totals.sgstPaise).toBe(0)
      }
    }
  })
})

describe('display helpers', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatCurrency(123_456_789).replace(/ /g, ' ')).toBe('₹12,34,567.89')
  })

  it('drops decimals for whole rupee amounts', () => {
    expect(formatCurrency(1_000_000).replace(/ /g, ' ')).toBe('₹10,000')
  })

  it('round-trips rupees to paise', () => {
    expect(rupeesToPaise(1234.56)).toBe(123_456)
    expect(rupeesToPaise(0.1)).toBe(10)
  })
})
