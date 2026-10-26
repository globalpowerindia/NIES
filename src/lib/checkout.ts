import { sql } from 'drizzle-orm'
import type { Payload, PayloadRequest } from 'payload'

import { nextDocumentNumber } from '@/lib/document-numbers'
import { stateName } from '@/lib/indian-states'
import { computeCartTotals, DEFAULT_GST_RATE_BPS, type CartTotals } from '@/lib/money'
import { sendNewOrderAlert, sendOrderConfirmation } from '@/lib/order-emails'
import { OutOfStockError, reserveOrderStock, sellOrderStock } from '@/lib/order-stock'
import {
  createRazorpayOrder,
  fetchOrderPayments,
  razorpayKeys,
  type RazorpayKeys,
} from '@/lib/razorpay'
import { parcelWeightGrams, shippingFeePaise, type ShippingRates } from '@/lib/shipping'
import { checkCartCoupon, findCart, loadCartView, type CartView } from '@/lib/storefront/cart'
import { relId } from '@/lib/storefront/products'
import { inTransaction, transactionDB } from '@/lib/transaction'
import type { Address, Customer, Order } from '@/payload-types'

/**
 * Checkout: the cart becomes an order, Razorpay takes the payment, and the
 * payment confirms the order.
 *
 * 1. `placeOrder` prices the cart afresh, holds its stock and saves an order
 *    awaiting payment, then opens a Razorpay order for exactly that total.
 * 2. Razorpay reports the payment twice: to the browser, which posts the
 *    signed result to /api/checkout/verify, and to our webhook. Either one
 *    calls `confirmPayment`; whichever is second finds the work done.
 * 3. An order still unpaid after `PAYMENT_WINDOW_MINUTES` is cancelled by
 *    `expireUnpaidOrders`, which gives its stock back.
 */

export const PAYMENT_WINDOW_MINUTES = 30

const orderLock = (razorpayOrderId: string) => `order:razorpay:${razorpayOrderId}`
const cartLock = (customerId: number) => `cart:customer:${customerId}`

export const loadShippingRates = async (payload: Payload): Promise<ShippingRates> => {
  const settings = await payload.findGlobal({ slug: 'checkout-settings', depth: 0, overrideAccess: true })
  return {
    slabs: (settings.shippingSlabs ?? []).map((slab) => ({
      maxWeightGrams: Math.round(Number(slab.maxWeightKg) * 1000),
      withinStatePaise: slab.withinStatePaise,
      otherStatesPaise: slab.otherStatesPaise,
    })),
    extraPerKgWithinStatePaise: settings.extraPerKgWithinStatePaise ?? 0,
    extraPerKgOtherStatesPaise: settings.extraPerKgOtherStatesPaise ?? 0,
    defaultWeightGrams: Math.round(Number(settings.defaultWeightKg ?? 5) * 1000),
  }
}

/** What a line needs for the invoice and the parcel, beyond what the cart shows. */
type LineFacts = { hsnCode: string; gstRateBps: number; weightGrams: number | null }

const loadLineFacts = async (payload: Payload, cart: CartView): Promise<Map<number, LineFacts>> => {
  const variantIds = cart.lines.map((line) => line.variantId)
  const productIds = [...new Set(cart.lines.map((line) => line.productId))]
  const [variants, products] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { id: { in: variantIds } },
      pagination: false,
      depth: 0,
      select: { weightGrams: true },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'products',
      where: { id: { in: productIds } },
      pagination: false,
      depth: 0,
      select: { hsnCode: true, gstRateBps: true },
      overrideAccess: true,
    }),
  ])
  const weight = new Map(variants.docs.map((variant) => [variant.id, variant.weightGrams ?? null]))
  const tax = new Map(products.docs.map((product) => [product.id, product]))
  return new Map(
    cart.lines.map((line) => [
      line.variantId,
      {
        hsnCode: tax.get(line.productId)?.hsnCode ?? '8467',
        gstRateBps: tax.get(line.productId)?.gstRateBps ?? DEFAULT_GST_RATE_BPS,
        weightGrams: weight.get(line.variantId) ?? null,
      },
    ]),
  )
}

export type CheckoutQuote = {
  cart: CartView
  stateCode: string
  weightGrams: number
  totals: CartTotals
  /** Delivery a free-delivery coupon waived; already left out of `totals`. */
  deliveryDiscountPaise: number
  facts: Map<number, LineFacts>
}

/**
 * The order this cart would be, delivered to an address in `stateCode`:
 * today's prices and coupon, the delivery fee for its weight, and GST split
 * by state.
 */
export const quoteCheckout = async (
  payload: Payload,
  cart: CartView,
  stateCode: string,
  rates?: ShippingRates,
): Promise<CheckoutQuote> => {
  const shipping = rates ?? (await loadShippingRates(payload))
  const facts = await loadLineFacts(payload, cart)
  const weightGrams = parcelWeightGrams(
    cart.lines.map((line) => ({ weightGrams: facts.get(line.variantId)?.weightGrams, quantity: line.quantity })),
    shipping.defaultWeightGrams,
  )
  const fee = shippingFeePaise(shipping, weightGrams, stateCode)
  const freeDelivery = Boolean(cart.coupon?.applied && cart.coupon.freeShipping)
  const totals = computeCartTotals({
    lines: cart.lines.map((line) => ({
      sellingPricePaise: line.unitPricePaise,
      quantity: line.quantity,
      gstRateBps: facts.get(line.variantId)!.gstRateBps,
      discountable: line.couponEligible,
    })),
    shipStateCode: stateCode,
    discountPaise: cart.discountPaise,
    shippingPaise: freeDelivery ? 0 : fee,
  })
  return { cart, stateCode, weightGrams, totals, facts, deliveryDiscountPaise: freeDelivery ? fee : 0 }
}

/** Why a cart can't be checked out right now, or null when it can. */
export const checkoutProblem = (cart: CartView): string | null => {
  if (cart.lines.length === 0) return 'Your cart is empty.'
  if (!cart.canCheckout) return 'Some items in your cart need attention before you can check out.'
  const unpriced = cart.lines.find((line) => line.unitPricePaise <= 0)
  if (unpriced) return `${unpriced.name} can't be bought online yet. Remove it or contact us for a price.`
  return null
}

export type PlaceOrderInput = {
  customer: Customer
  addressId: number
  email: string
  gstin: string | null
  /** The total the shopper saw. A different total now means prices moved: show them before charging. */
  expectedTotalPaise: number
}

export type PlacedOrder = {
  orderId: number
  orderNumber: string
  razorpayOrderId: string
  amountPaise: number
  expiresAt: string
}

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder; keyId: string }
  | { ok: false; status: number; error: string; code?: 'TOTAL_CHANGED' | 'OUT_OF_STOCK' }

const snapshotItems = (quote: CheckoutQuote) =>
  quote.cart.lines.map((line, index) => {
    const facts = quote.facts.get(line.variantId)!
    const priced = quote.totals.lines[index]
    return {
      product: line.productId,
      productName: line.variantName ? `${line.name} (${line.variantName})` : line.name,
      sku: line.sku ?? `VARIANT-${line.variantId}`,
      quantity: line.quantity,
      hsnCode: facts.hsnCode,
      gstRateBps: facts.gstRateBps,
      unitPricePaise: line.unitPricePaise,
      lineNetPaise: priced.netPaise,
      lineTaxablePaise: priced.taxablePaise,
      lineTaxPaise: priced.taxPaise,
    }
  })

class CouponChangedError extends Error {}

/** The coupon must still apply, for the same discount, now that its lock is held. */
const recheckCoupon = async (
  req: PayloadRequest,
  couponId: number,
  cartId: number,
  customerId: number,
  cart: CartView,
  expectedDiscountPaise: number,
) => {
  const rule = await req.payload.findByID({ collection: 'coupons', id: couponId, depth: 0, overrideAccess: true, req, disableErrors: true })
  if (!rule) throw new CouponChangedError('That coupon is no longer available.')
  const products = await req.payload.find({
    collection: 'products',
    where: { id: { in: cart.lines.map((line) => line.productId) } },
    pagination: false,
    depth: 0,
    select: { category: true, brand: true },
    overrideAccess: true,
    req,
  })
  const byId = new Map(products.docs.map((product) => [product.id, product]))
  const { check } = await checkCartCoupon(
    req.payload,
    rule,
    {
      cartId,
      customerId,
      lines: cart.lines.map((line) => ({
        productId: line.productId,
        grossPaise: line.unitPricePaise * line.quantity,
        categoryId: relId(byId.get(line.productId)?.category) ?? null,
        brandId: relId(byId.get(line.productId)?.brand) ?? null,
      })),
    },
    req,
  )
  if (!check.ok) throw new CouponChangedError(`Coupon ${rule.code}: ${check.message}`)
  if (check.discountPaise !== expectedDiscountPaise) throw new CouponChangedError(`Coupon ${rule.code} has changed.`)
}

/** A still-open order for this cart and total, so a double click or a retry doesn't open a second payment. */
const reusablePendingOrder = async (
  req: PayloadRequest,
  cartId: number,
  quote: CheckoutQuote,
  address: Address,
): Promise<Order | null> => {
  const { docs } = await req.payload.find({
    collection: 'orders',
    where: { and: [{ cart: { equals: cartId } }, { status: { equals: 'PENDING_PAYMENT' } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const now = Date.now()
  let reusable: Order | null = null
  for (const order of docs) {
    const same =
      order.razorpayOrderId &&
      order.grandTotalPaise === quote.totals.grandTotalPaise &&
      order.shipLine1 === address.line1 &&
      order.shipPincode === address.pincode &&
      new Date(order.paymentExpiresAt ?? 0).getTime() - now > 5 * 60_000
    if (same && !reusable) {
      reusable = order
      continue
    }
    // Superseded: the cart, address or total changed since. Its stock goes back.
    await req.payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'CANCELLED', cancelReason: 'SUPERSEDED', notes: 'Superseded by a newer checkout for the same cart.' },
      overrideAccess: true,
      req,
    })
  }
  return reusable
}

export const placeOrder = async (payload: Payload, input: PlaceOrderInput): Promise<PlaceOrderResult> => {
  const keys = razorpayKeys()
  if (!keys) return { ok: false, status: 503, error: 'Online payment isn’t available right now. Please try again later.' }

  const cartRef = await findCart(payload, input.customer.id)
  const cart = await loadCartView(payload, cartRef)
  const problem = checkoutProblem(cart)
  if (!cartRef || problem) return { ok: false, status: 409, error: problem ?? 'Your cart is empty.' }

  const { docs } = await payload.find({
    collection: 'addresses',
    where: { and: [{ id: { equals: input.addressId } }, { customer: { equals: input.customer.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const address = docs[0]
  if (!address) return { ok: false, status: 404, error: 'Choose a delivery address.' }

  const quote = await quoteCheckout(payload, cart, address.stateCode)
  if (quote.totals.grandTotalPaise !== input.expectedTotalPaise) {
    return {
      ok: false,
      status: 409,
      code: 'TOTAL_CHANGED',
      error: 'Your total has changed since the page loaded. Please check it before paying.',
    }
  }

  let order: Order
  try {
    const couponId = cart.coupon?.applied ? cartRef.couponId : null
    const locks = [cartLock(input.customer.id), ...(couponId ? [`coupon:${couponId}`] : [])]
    order = await inTransaction(payload, locks, async (req) => {
      // Under the coupon's lock: nobody else can take its last use between this check and the order holding it.
      if (couponId) await recheckCoupon(req, couponId, cartRef.id, input.customer.id, cart, quote.totals.discountPaise)
      const existing = await reusablePendingOrder(req, cartRef.id, quote, address)
      if (existing) return existing

      const placedAt = new Date()
      const db = await transactionDB(req)
      const created = await req.payload.create({
        collection: 'orders',
        data: {
          orderNumber: await nextDocumentNumber(db, 'order', placedAt),
          status: 'PENDING_PAYMENT',
          placedAt: placedAt.toISOString(),
          customer: input.customer.id,
          customerName: address.fullName,
          customerEmail: input.email,
          customerPhone: address.phone,
          customerGstin: input.gstin,
          shipLine1: address.line1,
          shipLine2: address.line2,
          shipCity: address.city,
          shipPincode: address.pincode,
          shipStateCode: address.stateCode,
          shipStateName: stateName(address.stateCode),
          items: snapshotItems(quote),
          subtotalPaise: quote.totals.subtotalPaise,
          discountPaise: quote.totals.discountPaise,
          shippingPaise: quote.totals.shippingPaise,
          taxablePaise: quote.totals.taxablePaise,
          cgstPaise: quote.totals.cgstPaise,
          sgstPaise: quote.totals.sgstPaise,
          igstPaise: quote.totals.igstPaise,
          grandTotalPaise: quote.totals.grandTotalPaise,
          paymentMethod: 'RAZORPAY',
          paymentExpiresAt: new Date(placedAt.getTime() + PAYMENT_WINDOW_MINUTES * 60_000).toISOString(),
          coupon: cart.coupon?.applied ? cartRef.couponId : null,
          couponCode: cart.coupon?.applied ? cart.coupon.code : null,
          shippingWeightGrams: quote.weightGrams,
          deliveryDiscountPaise: quote.deliveryDiscountPaise,
          cart: cartRef.id,
        },
        overrideAccess: true,
        req,
      })
      await reserveOrderStock(
        req,
        created.id,
        cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, sku: line.sku ?? line.name })),
      )
      return created
    })
  } catch (error) {
    if (error instanceof CouponChangedError) {
      return { ok: false, status: 409, code: 'TOTAL_CHANGED', error: `${error.message} Your total has been updated.` }
    }
    if (error instanceof OutOfStockError) {
      return {
        ok: false,
        status: 409,
        code: 'OUT_OF_STOCK',
        error: 'Someone just bought the last of an item in your cart. Please review your cart.',
      }
    }
    throw error
  }

  if (!order.razorpayOrderId) {
    try {
      const razorpayOrder = await createRazorpayOrder(keys, {
        amountPaise: order.grandTotalPaise,
        receipt: order.orderNumber,
        notes: { orderNumber: order.orderNumber, orderId: String(order.id) },
      })
      order = await payload.update({
        collection: 'orders',
        id: order.id,
        data: { razorpayOrderId: razorpayOrder.id },
        overrideAccess: true,
      })
    } catch (error) {
      payload.logger.error({ err: error, orderNumber: order.orderNumber }, 'Could not open a Razorpay order')
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'CANCELLED', cancelReason: 'GATEWAY_ERROR', notes: 'Razorpay order could not be created.' },
        overrideAccess: true,
      })
      return { ok: false, status: 502, error: 'We couldn’t reach the payment provider. Please try again in a moment.' }
    }
  }

  return {
    ok: true,
    keyId: keys.keyId,
    order: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: order.razorpayOrderId!,
      amountPaise: order.grandTotalPaise,
      expiresAt: order.paymentExpiresAt!,
    },
  }
}

export type ConfirmResult =
  | { status: 'CONFIRMED' | 'ALREADY_CONFIRMED'; order: Order }
  | { status: 'NEEDS_REFUND'; order: Order }
  | { status: 'NOT_FOUND' | 'AMOUNT_MISMATCH' }

/**
 * Why a cancelled order can't be brought back by a late payment, or null if it can.
 *
 * Only an order that simply ran out of time qualifies (a slow bank page), and
 * only on today's terms: nothing in it may cost more now, and its coupon must
 * still apply for the same discount. Without this, paying the Razorpay orders
 * of superseded checkouts would spend a once-per-customer code once per order.
 */
const revivalProblem = async (req: PayloadRequest, order: Order): Promise<string | null> => {
  if (order.cancelReason !== 'EXPIRED') return 'it had been cancelled'

  const items = order.items ?? []
  const { docs: variants } = await req.payload.find({
    collection: 'product-variants',
    where: { sku: { in: items.map((item) => item.sku) } },
    pagination: false,
    depth: 0,
    select: { sku: true, sellingPricePaise: true },
    overrideAccess: true,
    req,
  })
  const priceNow = new Map(variants.map((variant) => [variant.sku, variant.sellingPricePaise]))
  const dearer = items.find((item) => (priceNow.get(item.sku) ?? 0) > item.unitPricePaise)
  if (dearer) return `${dearer.sku} costs more now than when it was ordered`

  const couponId = relId(order.coupon)
  if (!couponId) return null
  // The same lock checkout takes, so the code's last use can't also go to a checkout happening now.
  const db = await transactionDB(req)
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`coupon:${couponId}`}, 0))`)
  const rule = await req.payload.findByID({ collection: 'coupons', id: couponId, depth: 0, overrideAccess: true, req, disableErrors: true })
  if (!rule) return `coupon ${order.couponCode} no longer exists`

  const productIds = items.map((item) => relId(item.product)).filter((id): id is number => id !== undefined)
  const { docs: products } = await req.payload.find({
    collection: 'products',
    where: { id: { in: productIds } },
    pagination: false,
    depth: 0,
    select: { category: true, brand: true },
    overrideAccess: true,
    req,
  })
  const byId = new Map(products.map((product) => [product.id, product]))
  const { check } = await checkCartCoupon(
    req.payload,
    rule,
    {
      // No cart to leave out: every other open checkout holding the code counts.
      cartId: null,
      customerId: relId(order.customer) ?? null,
      lines: items.map((item) => {
        const productId = relId(item.product) ?? -1
        return {
          productId,
          grossPaise: item.unitPricePaise * item.quantity,
          categoryId: relId(byId.get(productId)?.category) ?? null,
          brandId: relId(byId.get(productId)?.brand) ?? null,
        }
      }),
    },
    req,
  )
  if (!check.ok) return `coupon ${rule.code} no longer applies (${check.message})`
  if (check.discountPaise !== (order.discountPaise ?? 0)) return `coupon ${rule.code} has changed`
  return null
}

/** Leaves the order cancelled, with the payment on it and a note telling staff to refund. */
const flagForRefund = async (req: PayloadRequest, order: Order, paymentId: string, reason: string) => {
  const flagged = await req.payload.update({
    collection: 'orders',
    id: order.id,
    data: {
      razorpayPaymentId: paymentId,
      notes: [order.notes, `Paid after the order was cancelled, but ${reason}. Refund payment ${paymentId} from the Razorpay dashboard.`]
        .filter(Boolean)
        .join('\n'),
    },
    overrideAccess: true,
    req,
  })
  return { status: 'NEEDS_REFUND' as const, order: flagged, alert: `ACTION NEEDED: paid after cancellation, but ${reason}. Refund ${paymentId}.` }
}

/**
 * Marks the order paid: stock sold, invoice number issued, coupon use
 * recorded, cart closed. Idempotent, and safe for the browser and the webhook
 * to call at once: both take the same lock, and the second finds it done.
 *
 * A payment can land after the order was cancelled. An expired order whose
 * terms and stock still hold is revived; anything else stays cancelled and
 * staff are told to refund (see `revivalProblem`).
 */
export const confirmPayment = async (
  payload: Payload,
  input: { razorpayOrderId: string; razorpayPaymentId: string; amountPaise?: number },
): Promise<ConfirmResult> => {
  const outcome = await inTransaction(payload, [orderLock(input.razorpayOrderId)], async (req) => {
    const { docs } = await req.payload.find({
      collection: 'orders',
      where: { razorpayOrderId: { equals: input.razorpayOrderId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const order = docs[0]
    if (!order) return { status: 'NOT_FOUND' as const }
    if (input.amountPaise !== undefined && input.amountPaise !== order.grandTotalPaise) {
      payload.logger.error(
        { orderNumber: order.orderNumber, paid: input.amountPaise, due: order.grandTotalPaise },
        'Razorpay amount does not match the order',
      )
      return { status: 'AMOUNT_MISMATCH' as const }
    }
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED') {
      return { status: 'ALREADY_CONFIRMED' as const, order, backordered: [] as number[] }
    }
    if (order.status === 'CANCELLED' && order.paidAt) {
      return { status: 'ALREADY_CONFIRMED' as const, order, backordered: [] as number[] }
    }

    if (order.status === 'CANCELLED') {
      // The browser and the webhook both report a payment: the second finds it already flagged.
      if (order.razorpayPaymentId === input.razorpayPaymentId) return { status: 'NEEDS_REFUND' as const, order, alert: null }
      const problem = await revivalProblem(req, order)
      if (problem) return flagForRefund(req, order, input.razorpayPaymentId, problem)
      try {
        await reserveOrderStock(req, order.id, await variantLines(req, order))
      } catch (error) {
        if (!(error instanceof OutOfStockError)) throw error
        return flagForRefund(req, order, input.razorpayPaymentId, `${error.sku} is out of stock`)
      }
    }

    const backordered = await sellOrderStock(req, order.id)
    const paidAt = new Date()
    const db = await transactionDB(req)
    const confirmed = await req.payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        status: 'CONFIRMED',
        paidAt: paidAt.toISOString(),
        razorpayPaymentId: input.razorpayPaymentId,
        invoiceNumber: await nextDocumentNumber(db, 'invoice', paidAt),
      },
      overrideAccess: true,
      req,
    })

    const couponId = relId(order.coupon)
    if (couponId) {
      await req.payload.create({
        collection: 'coupon-redemptions',
        data: {
          coupon: couponId,
          order: order.id,
          customer: relId(order.customer) ?? null,
          // What the code saved them: items plus any delivery it waived.
          discountPaise: (order.discountPaise ?? 0) + (order.deliveryDiscountPaise ?? 0),
        },
        overrideAccess: true,
        req,
      })
    }

    const cartId = relId(order.cart)
    if (cartId) {
      await req.payload.update({
        collection: 'carts',
        where: { and: [{ id: { equals: cartId } }, { status: { equals: 'ACTIVE' } }] },
        data: { status: 'CONVERTED' },
        overrideAccess: true,
        req,
      })
    }
    return { status: 'CONFIRMED' as const, order: confirmed, backordered }
  })

  if (outcome.status === 'CONFIRMED') await notifyConfirmed(payload, outcome.order, outcome.backordered)
  if (outcome.status === 'NEEDS_REFUND' && outcome.alert) {
    payload.logger.warn({ orderNumber: outcome.order.orderNumber, payment: input.razorpayPaymentId }, outcome.alert)
    await sendNewOrderAlert(payload, outcome.order, [outcome.alert]).catch((err) =>
      payload.logger.error({ err }, 'Order alert failed'),
    )
  }
  if (outcome.status === 'ALREADY_CONFIRMED' || outcome.status === 'CONFIRMED' || outcome.status === 'NEEDS_REFUND') {
    return { status: outcome.status, order: outcome.order }
  }
  return outcome
}

const variantLines = async (req: PayloadRequest, order: Order) => {
  const skus = (order.items ?? []).map((item) => item.sku)
  const { docs } = await req.payload.find({
    collection: 'product-variants',
    where: { sku: { in: skus } },
    pagination: false,
    depth: 0,
    select: { sku: true },
    overrideAccess: true,
    req,
  })
  const bySku = new Map(docs.map((variant) => [variant.sku, variant.id]))
  return (order.items ?? []).flatMap((item) => {
    const variantId = bySku.get(item.sku)
    if (!variantId) throw new OutOfStockError(item.sku)
    return [{ variantId, quantity: item.quantity, sku: item.sku }]
  })
}

/** Emails go after the commit: a mail outage must never undo a paid order. Sent once. */
const notifyConfirmed = async (payload: Payload, order: Order, backordered: number[]) => {
  try {
    await sendOrderConfirmation(payload, order)
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { confirmationEmailSentAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err, orderNumber: order.orderNumber }, 'Order confirmation email failed')
  }
  await sendNewOrderAlert(
    payload,
    order,
    backordered.length ? ['Some items were backordered: there was not enough on hand when this was paid.'] : [],
  ).catch((err) => payload.logger.error({ err, orderNumber: order.orderNumber }, 'Order alert failed'))
}

/**
 * Gives up on orders nobody paid for in time. Each is checked with Razorpay
 * first: a payment whose webhook is late confirms the order instead.
 */
export const expireUnpaidOrders = async (
  payload: Payload,
  keys: RazorpayKeys | null = razorpayKeys(),
): Promise<{ cancelled: number; confirmed: number }> => {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [{ status: { equals: 'PENDING_PAYMENT' } }, { paymentExpiresAt: { less_than: new Date().toISOString() } }],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  let cancelled = 0
  let confirmed = 0
  for (const order of docs) {
    if (keys && order.razorpayOrderId) {
      const payments = await fetchOrderPayments(keys, order.razorpayOrderId).catch(() => null)
      // Can't tell whether it was paid: leave it for the next run rather than cancel a paid order.
      if (!payments) continue
      const paid = payments.find((payment) => payment.status === 'captured')
      if (paid) {
        const result = await confirmPayment(payload, {
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: paid.id,
          amountPaise: paid.amount,
        })
        if (result.status === 'CONFIRMED') confirmed += 1
        continue
      }
    }
    await inTransaction(payload, order.razorpayOrderId ? [orderLock(order.razorpayOrderId)] : [], async (req) => {
      await req.payload.update({
        collection: 'orders',
        where: { and: [{ id: { equals: order.id } }, { status: { equals: 'PENDING_PAYMENT' } }] },
        data: { status: 'CANCELLED', cancelReason: 'EXPIRED', notes: 'Payment was not completed in time.' },
        overrideAccess: true,
        req,
      })
    })
    cancelled += 1
  }
  return { cancelled, confirmed }
}

