import { describe, expect, it } from 'vitest'

import { buildInvoiceData, invoiceSeller } from '@/lib/invoice/invoice-data'
import { computeCartTotals } from '@/lib/money'
import type { Order } from '@/payload-types'

const seller = { legalName: 'Global Power India Pvt Ltd', gstin: '32ABCDE1234F1Z5', address: 'Kochi, Kerala', phone: null, email: null, footer: null }

/** An order as checkout writes it: the snapshot fields come straight from computeCartTotals. */
const orderFor = (shipStateCode: string, discountPaise = 0, shippingPaise = 0): Order => {
  const input = [
    { sellingPricePaise: 1_249_900, quantity: 2, gstRateBps: 1800 },
    { sellingPricePaise: 333_333, quantity: 3, gstRateBps: 1200 },
    { sellingPricePaise: 99_999, quantity: 1, gstRateBps: 500 },
  ]
  const totals = computeCartTotals({ lines: input, shipStateCode, discountPaise, shippingPaise })
  return {
    id: 1,
    orderNumber: 'PT-2627-000042',
    invoiceNumber: 'INV-2627-000017',
    paidAt: '2026-10-28T05:30:00.000Z',
    customerName: 'Anoop Menon',
    shipLine1: '12 MG Road',
    shipCity: 'Kochi',
    shipStateName: shipStateCode === '32' ? 'Kerala' : 'Tamil Nadu',
    shipStateCode,
    shipPincode: '682016',
    items: totals.lines.map((line, index) => ({
      productName: `Item ${index}`,
      sku: `SKU-${index}`,
      hsnCode: '8467',
      quantity: line.quantity,
      gstRateBps: line.gstRateBps,
      unitPricePaise: line.sellingPricePaise,
      lineNetPaise: line.netPaise,
    })),
    discountPaise: totals.discountPaise,
    shippingPaise: totals.shippingPaise,
    taxablePaise: totals.taxablePaise,
    cgstPaise: totals.cgstPaise,
    sgstPaise: totals.sgstPaise,
    igstPaise: totals.igstPaise,
    grandTotalPaise: totals.grandTotalPaise,
  } as unknown as Order
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

describe('buildInvoiceData', () => {
  for (const [label, order] of [
    ['within Kerala', orderFor('32')],
    ['another state, with a coupon and delivery', orderFor('33', 150_000, 29_500)],
    ['Kerala, with delivery', orderFor('32', 0, 9_900)],
  ] as const) {
    it(`adds up to the order's own totals: ${label}`, () => {
      const invoice = buildInvoiceData(order, seller)!
      expect(sum(invoice.lines.map((line) => line.taxablePaise))).toBe(order.taxablePaise)
      expect(sum(invoice.lines.map((line) => line.taxPaise))).toBe(invoice.cgstPaise + invoice.sgstPaise + invoice.igstPaise)
      expect(sum(invoice.lines.map((line) => line.amountPaise))).toBe(order.grandTotalPaise)
      for (const line of invoice.lines) expect(line.taxablePaise + line.taxPaise).toBe(line.amountPaise)
    })
  }

  it('charges IGST outside Kerala and CGST + SGST within it', () => {
    expect(buildInvoiceData(orderFor('33'), seller)).toMatchObject({ interState: true, cgstPaise: 0, sgstPaise: 0 })
    expect(buildInvoiceData(orderFor('32'), seller)).toMatchObject({ interState: false, igstPaise: 0 })
  })

  it('lists delivery as its own line under SAC 9965', () => {
    const lines = buildInvoiceData(orderFor('32', 0, 9_900), seller)!.lines
    expect(lines.at(-1)).toMatchObject({ description: 'Delivery charges', hsn: '9965', amountPaise: 9_900 })
  })

  it('issues nothing for an order that was never paid', () => {
    expect(buildInvoiceData({ ...orderFor('32'), invoiceNumber: null, paidAt: null }, seller)).toBeNull()
  })
})

describe('invoiceSeller', () => {
  it('needs the legal name, GSTIN and address before any invoice goes out', () => {
    expect(invoiceSeller({ invoice: { legalName: 'X', gstin: '32ABCDE1234F1Z5', address: '' } })).toBeNull()
    expect(invoiceSeller({ invoice: { legalName: ' X ', gstin: '32ABCDE1234F1Z5', address: 'Kochi' } })).toMatchObject({ legalName: 'X' })
  })
})
