import { amountInWords } from '@/lib/amount-in-words'
import { DEFAULT_GST_RATE_BPS, SELLER_STATE_CODE, splitInclusive } from '@/lib/money'
import type { CheckoutSetting, Order } from '@/payload-types'

/**
 * Everything a GST tax invoice prints (CGST Rules, rule 46), taken from the
 * order's own snapshot: never from today's products or prices.
 *
 * Prices are GST-inclusive, so each line's taxable value is split out with
 * the same `splitInclusive` checkout used, and delivery at the rate checkout
 * charged it. The line taxes then add up to exactly the CGST + SGST + IGST
 * on the order; the totals printed are the order's, the line figures show
 * how they were reached.
 */

export type InvoiceSeller = { legalName: string; gstin: string; address: string; phone: string | null; email: string | null; footer: string | null }

export type InvoiceLine = {
  description: string
  sku: string | null
  hsn: string
  quantity: number
  ratePercent: number
  /** What the customer paid for the line, GST included, after any coupon. */
  amountPaise: number
  taxablePaise: number
  taxPaise: number
}

export type InvoiceData = {
  seller: InvoiceSeller
  invoiceNumber: string
  invoiceDate: string
  orderNumber: string
  buyer: { name: string; gstin: string | null; phone: string | null; addressLines: string[]; stateName: string; stateCode: string }
  placeOfSupply: string
  interState: boolean
  lines: InvoiceLine[]
  couponCode: string | null
  discountPaise: number
  taxablePaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  grandTotalPaise: number
  amountInWords: string
  paymentReference: string | null
}

/** The seller's details, or null while any that an invoice must carry is missing. */
export const invoiceSeller = (settings: Pick<CheckoutSetting, 'invoice'>): InvoiceSeller | null => {
  const invoice = settings.invoice
  const legalName = invoice?.legalName?.trim()
  const gstin = invoice?.gstin?.trim()
  const address = invoice?.address?.trim()
  if (!legalName || !gstin || !address) return null
  return {
    legalName,
    gstin,
    address,
    phone: invoice?.phone?.trim() || null,
    email: invoice?.email?.trim() || null,
    footer: invoice?.footer?.trim() || null,
  }
}

/** A paid order's invoice, or null for one that has no invoice number (never paid). */
export const buildInvoiceData = (order: Order, seller: InvoiceSeller): InvoiceData | null => {
  if (!order.invoiceNumber || !order.paidAt) return null

  const lines: InvoiceLine[] = (order.items ?? []).map((item) => {
    const { taxablePaise, taxPaise } = splitInclusive(item.lineNetPaise, item.gstRateBps)
    return {
      description: item.productName,
      sku: item.sku ?? null,
      hsn: item.hsnCode,
      quantity: item.quantity,
      ratePercent: item.gstRateBps / 100,
      amountPaise: item.lineNetPaise,
      taxablePaise,
      taxPaise,
    }
  })
  if (order.shippingPaise) {
    // Delivery is a service: SAC 9965, at the rate checkout charges it.
    const { taxablePaise, taxPaise } = splitInclusive(order.shippingPaise, DEFAULT_GST_RATE_BPS)
    lines.push({
      description: 'Delivery charges',
      sku: null,
      hsn: '9965',
      quantity: 1,
      ratePercent: DEFAULT_GST_RATE_BPS / 100,
      amountPaise: order.shippingPaise,
      taxablePaise,
      taxPaise,
    })
  }

  const interState = order.shipStateCode !== SELLER_STATE_CODE
  return {
    seller,
    invoiceNumber: order.invoiceNumber,
    invoiceDate: order.paidAt,
    orderNumber: order.orderNumber,
    buyer: {
      name: order.customerName,
      gstin: order.customerGstin ?? null,
      phone: order.customerPhone ?? null,
      addressLines: [
        order.shipLine1,
        order.shipLine2,
        order.shipLandmark,
        `${order.shipCity}, ${order.shipStateName} - ${order.shipPincode}`,
      ].filter((line): line is string => Boolean(line)),
      stateName: order.shipStateName,
      stateCode: order.shipStateCode,
    },
    placeOfSupply: `${order.shipStateName} (${order.shipStateCode})`,
    interState,
    lines,
    couponCode: order.couponCode ?? null,
    discountPaise: order.discountPaise ?? 0,
    taxablePaise: order.taxablePaise,
    cgstPaise: order.cgstPaise ?? 0,
    sgstPaise: order.sgstPaise ?? 0,
    igstPaise: order.igstPaise ?? 0,
    grandTotalPaise: order.grandTotalPaise,
    amountInWords: amountInWords(order.grandTotalPaise),
    paymentReference: order.razorpayPaymentId ?? null,
  }
}
