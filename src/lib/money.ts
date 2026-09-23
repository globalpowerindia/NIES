export const SELLER_STATE_CODE = '32'

export const DEFAULT_GST_RATE_BPS = 1800

export const GST_RATES_BPS = [0, 500, 1200, 1800, 2800] as const

export type CartLineInput = {
  sellingPricePaise: number
  quantity: number
  gstRateBps: number
}

export type CartLine = CartLineInput & {
  grossPaise: number
  discountPaise: number
  netPaise: number
  taxablePaise: number
  taxPaise: number
}

export type CartTotalsInput = {
  lines: CartLineInput[]
  shipStateCode: string
  discountPaise?: number
  shippingPaise?: number
  shippingGstRateBps?: number
}

export type CartTotals = {
  lines: CartLine[]
  subtotalPaise: number
  discountPaise: number
  shippingPaise: number
  taxablePaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  grandTotalPaise: number
}

export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5)
}

export function isPaise(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

export function assertPaise(value: number, label: string): void {
  if (!isPaise(value)) {
    throw new Error(`${label} must be a non-negative integer in paise, received ${value}`)
  }
}

/**
 * Largest-remainder apportionment: floor every share, then hand the leftover
 * paise to the largest fractions. Guarantees the parts sum to the whole, which
 * naive per-line rounding does not.
 */
export function allocateDiscount(grossPaise: number[], totalDiscountPaise: number): number[] {
  const total = grossPaise.reduce((sum, value) => sum + value, 0)
  if (total <= 0 || totalDiscountPaise <= 0) return grossPaise.map(() => 0)

  const capped = Math.min(totalDiscountPaise, total)
  const exact = grossPaise.map((gross) => (gross * capped) / total)
  const allocated = exact.map((value) => Math.floor(value))

  let remainder = capped - allocated.reduce((sum, value) => sum + value, 0)

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  for (const { index } of byFraction) {
    if (remainder <= 0) break
    allocated[index] += 1
    remainder -= 1
  }

  return allocated
}

/**
 * Prices are stored GST-inclusive, so tax is extracted rather than added:
 * taxable = net * 10000 / (10000 + rateBps), and tax is the remainder so the
 * two always reconstruct net exactly.
 */
export function splitInclusive(netPaise: number, gstRateBps: number): {
  taxablePaise: number
  taxPaise: number
} {
  const taxablePaise = roundHalfUp((netPaise * 10000) / (10000 + gstRateBps))
  return { taxablePaise, taxPaise: netPaise - taxablePaise }
}

export function splitJurisdiction(taxPaise: number, shipStateCode: string) {
  if (shipStateCode === SELLER_STATE_CODE) {
    const cgstPaise = Math.floor(taxPaise / 2)
    return { cgstPaise, sgstPaise: taxPaise - cgstPaise, igstPaise: 0 }
  }
  return { cgstPaise: 0, sgstPaise: 0, igstPaise: taxPaise }
}

export function computeCartTotals(input: CartTotalsInput): CartTotals {
  const {
    lines: lineInputs,
    shipStateCode,
    discountPaise = 0,
    shippingPaise = 0,
    shippingGstRateBps = DEFAULT_GST_RATE_BPS,
  } = input

  lineInputs.forEach((line, index) => {
    assertPaise(line.sellingPricePaise, `lines[${index}].sellingPricePaise`)
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new Error(`lines[${index}].quantity must be a positive integer`)
    }
  })
  assertPaise(discountPaise, 'discountPaise')
  assertPaise(shippingPaise, 'shippingPaise')

  const grossPerLine = lineInputs.map((line) => line.sellingPricePaise * line.quantity)
  const discountPerLine = allocateDiscount(grossPerLine, discountPaise)

  const lines: CartLine[] = lineInputs.map((line, index) => {
    const grossPaise = grossPerLine[index]
    const lineDiscount = discountPerLine[index]
    const netPaise = grossPaise - lineDiscount
    const { taxablePaise, taxPaise } = splitInclusive(netPaise, line.gstRateBps)

    return {
      ...line,
      grossPaise,
      discountPaise: lineDiscount,
      netPaise,
      taxablePaise,
      taxPaise,
    }
  })

  const subtotalPaise = grossPerLine.reduce((sum, value) => sum + value, 0)
  const appliedDiscount = discountPerLine.reduce((sum, value) => sum + value, 0)
  const itemsNet = lines.reduce((sum, line) => sum + line.netPaise, 0)

  const shipping = splitInclusive(shippingPaise, shippingGstRateBps)

  const taxablePaise = lines.reduce((sum, line) => sum + line.taxablePaise, 0) + shipping.taxablePaise
  const taxPaise = lines.reduce((sum, line) => sum + line.taxPaise, 0) + shipping.taxPaise

  return {
    lines,
    subtotalPaise,
    discountPaise: appliedDiscount,
    shippingPaise,
    taxablePaise,
    ...splitJurisdiction(taxPaise, shipStateCode),
    grandTotalPaise: itemsNet + shippingPaise,
  }
}

/** Whole rupee amounts render without decimals, matching Indian retail pricing. */
export function formatCurrency(paise: number, options: { showPaise?: boolean } = {}): string {
  const fractionDigits = options.showPaise || paise % 100 !== 0 ? 2 : 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(paise / 100)
}

export function rupeesToPaise(rupees: number): number {
  return roundHalfUp(rupees * 100)
}
