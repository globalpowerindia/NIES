import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Category, Coupon, Product } from '@/payload-types'

vi.mock('@/lib/razorpay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/razorpay')>()),
  razorpayKeys: () => ({ keyId: 'rzp_test_key', keySecret: 'secret', webhookSecret: 'hook' }),
  createRazorpayOrder: async () => ({ id: `order_CPN${Date.now()}${Math.random().toString(36).slice(2, 8)}`, amount: 0, currency: 'INR', status: 'created' }),
  fetchOrderPayments: async () => [],
}))

const { confirmPayment, expireUnpaidOrders, placeOrder, quoteCheckout } = await import('@/lib/checkout')
const { addToCart, applyCoupon, findOrCreateCart, loadCartView } = await import('@/lib/storefront/cart')

let payload: Payload
const stamp = Date.now()
let seq = 0
const cleanup: { collection: 'customers' | 'products' | 'categories' | 'coupons'; id: number }[] = []

const makeProduct = async (pricePaise: number, categoryId?: number) => {
  const n = ++seq
  const category =
    categoryId ??
    (await payload.create({ collection: 'categories', data: { name: `Coupon test ${stamp}-${n}` } as Category, overrideAccess: true })).id
  if (!categoryId) cleanup.push({ collection: 'categories', id: category })
  const product = await payload.create({
    collection: 'products',
    data: { name: `Coupon tool ${stamp}-${n}`, status: 'ACTIVE', sellOnline: true, category, hsnCode: '8467', gstRateBps: 1800 } as Product,
    overrideAccess: true,
  })
  cleanup.push({ collection: 'products', id: product.id })
  const variant = await payload.create({
    collection: 'product-variants',
    data: { product: product.id, sku: `CPN-${stamp}-${n}`, name: 'Standard', mrpPaise: pricePaise, sellingPricePaise: pricePaise, isActive: true, weightGrams: 2000 },
    overrideAccess: true,
  })
  await payload.create({ collection: 'stock-movements', data: { variant: variant.id, type: 'RECEIVED', quantity: 50 }, overrideAccess: true })
  return { product, variant, categoryId: category }
}

const makeShopper = async (variantIds: number[]) => {
  const n = ++seq
  const customer = await payload.create({
    collection: 'customers',
    data: { email: `coupon-${stamp}-${n}@example.test`, status: 'ACTIVE' },
    overrideAccess: true,
  })
  cleanup.push({ collection: 'customers', id: customer.id })
  const address = await payload.create({
    collection: 'addresses',
    data: { customer: customer.id, fullName: 'Ravi Kumar', phone: '+919876543210', line1: '4 Beach Road', line2: 'Fort', city: 'Kochi', pincode: '682001', stateCode: '32', type: 'HOME' },
    overrideAccess: true,
  })
  const cart = await findOrCreateCart(payload, customer.id)
  for (const variantId of variantIds) await addToCart(payload, async () => cart, variantId, 1)
  return { customer, address, cart }
}

const makeCoupon = async (data: Partial<Coupon>) => {
  const coupon = await payload.create({
    collection: 'coupons',
    data: { code: `T${stamp}${++seq}`, type: 'PERCENT', percentBps: 1000, isActive: true, ...data } as Coupon,
    overrideAccess: true,
  })
  cleanup.push({ collection: 'coupons', id: coupon.id })
  return coupon
}

const withCoupon = async (shopper: Awaited<ReturnType<typeof makeShopper>>, code: string) => {
  const result = await applyCoupon(payload, shopper.cart, code)
  const fresh = await payload.findByID({ collection: 'carts', id: shopper.cart.id, depth: 0, overrideAccess: true })
  return { result, cart: { ...shopper.cart, couponId: typeof fresh.coupon === 'number' ? fresh.coupon : (fresh.coupon?.id ?? null) } }
}

const quoteFor = async (cart: Parameters<typeof loadCartView>[1]) => {
  const view = await loadCartView(payload, cart)
  return { view, quote: await quoteCheckout(payload, view, '32') }
}

const place = (shopper: Awaited<ReturnType<typeof makeShopper>>, expectedTotalPaise: number) =>
  placeOrder(payload, { customer: shopper.customer, addressId: shopper.address.id, email: 'ravi@example.test', gstin: null, expectedTotalPaise })

describe('Coupons', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.updateGlobal({
      slug: 'checkout-settings',
      data: { shippingSlabs: [{ maxWeightKg: 10, withinStatePaise: 20_000, otherStatesPaise: 40_000 }], extraPerKgWithinStatePaise: 1_000, extraPerKgOtherStatesPaise: 2_000, defaultWeightKg: 5 },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    for (const { collection, id } of cleanup.reverse()) {
      if (collection === 'customers') {
        await payload.delete({ collection: 'coupon-redemptions', where: { customer: { equals: id } }, overrideAccess: true })
        await payload.delete({ collection: 'orders', where: { customer: { equals: id } }, overrideAccess: true })
        await payload.delete({ collection: 'carts', where: { customer: { equals: id } }, overrideAccess: true })
        await payload.delete({ collection: 'addresses', where: { customer: { equals: id } }, overrideAccess: true })
      }
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('gives the last use to exactly one of two shoppers paying at once', async () => {
    const { variant } = await makeProduct(100_000)
    const coupon = await makeCoupon({ usageLimit: 1 })
    const a = await makeShopper([variant.id])
    const b = await makeShopper([variant.id])
    const [ca, cb] = [await withCoupon(a, coupon.code), await withCoupon(b, coupon.code)]
    expect(ca.result.ok && cb.result.ok).toBe(true)
    const [qa, qb] = [await quoteFor(ca.cart), await quoteFor(cb.cart)]
    expect(qa.quote.totals.discountPaise).toBe(10_000)

    const results = await Promise.all([place(a, qa.quote.totals.grandTotalPaise), place(b, qb.quote.totals.grandTotalPaise)])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.find((result) => !result.ok)).toMatchObject({ status: 409, code: 'TOTAL_CHANGED' })
  })

  it('holds the use while a checkout is open, and frees it when that checkout expires', async () => {
    const { variant } = await makeProduct(100_000)
    const coupon = await makeCoupon({ usageLimit: 1 })
    const a = await makeShopper([variant.id])
    const b = await makeShopper([variant.id])
    const ca = await withCoupon(a, coupon.code)
    const placed = await place(a, (await quoteFor(ca.cart)).quote.totals.grandTotalPaise)
    if (!placed.ok) throw new Error(placed.error)

    expect((await withCoupon(b, coupon.code)).result).toMatchObject({ ok: false })

    await payload.update({ collection: 'orders', id: placed.order.orderId, data: { paymentExpiresAt: new Date(Date.now() - 60_000).toISOString() }, overrideAccess: true })
    await expireUnpaidOrders(payload)
    expect((await withCoupon(b, coupon.code)).result).toMatchObject({ ok: true })
  })

  it('discounts only the items a scoped code covers', async () => {
    const covered = await makeProduct(100_000)
    const other = await makeProduct(50_000)
    const coupon = await makeCoupon({ percentBps: 2000, appliesTo: 'ITEMS', categories: [covered.categoryId] })
    const shopper = await makeShopper([covered.variant.id, other.variant.id])
    const { cart } = await withCoupon(shopper, coupon.code)
    const { view, quote } = await quoteFor(cart)

    expect(view.discountPaise).toBe(20_000)
    const lineFor = (productId: number) => quote.totals.lines[view.lines.findIndex((line) => line.productId === productId)]
    expect(lineFor(covered.product.id).discountPaise).toBe(20_000)
    expect(lineFor(other.product.id).discountPaise).toBe(0)
  })

  it('refuses a scoped code when nothing in the cart is covered', async () => {
    const covered = await makeProduct(100_000)
    const other = await makeProduct(50_000)
    const coupon = await makeCoupon({ appliesTo: 'ITEMS', products: [covered.product.id] })
    const shopper = await makeShopper([other.variant.id])
    expect((await withCoupon(shopper, coupon.code)).result).toMatchObject({ ok: false, status: 422 })
  })

  it('waives delivery for a free-delivery code and records it as the saving', async () => {
    const { variant } = await makeProduct(100_000)
    const coupon = await makeCoupon({ type: 'FREE_SHIPPING', percentBps: null })
    const shopper = await makeShopper([variant.id])
    const { cart } = await withCoupon(shopper, coupon.code)
    const { quote } = await quoteFor(cart)
    expect(quote.totals.shippingPaise).toBe(0)
    expect(quote.deliveryDiscountPaise).toBe(20_000)
    expect(quote.totals.grandTotalPaise).toBe(100_000)

    const placed = await place(shopper, quote.totals.grandTotalPaise)
    if (!placed.ok) throw new Error(placed.error)
    await confirmPayment(payload, { razorpayOrderId: placed.order.razorpayOrderId, razorpayPaymentId: `pay_FREE${stamp}` })
    const { docs } = await payload.find({ collection: 'coupon-redemptions', where: { coupon: { equals: coupon.id } }, overrideAccess: true })
    expect(docs).toHaveLength(1)
    expect(docs[0].discountPaise).toBe(20_000)
  })

  it('keeps a first-order code for customers who have never paid for an order', async () => {
    const { variant } = await makeProduct(100_000)
    const shopper = await makeShopper([variant.id])
    const welcome = await makeCoupon({ firstOrderOnly: true })
    expect((await withCoupon(shopper, welcome.code)).result).toMatchObject({ ok: true })

    // Pay for one order without the code, then try it on the next cart.
    await payload.update({ collection: 'carts', id: shopper.cart.id, data: { coupon: null }, overrideAccess: true })
    const placed = await place(shopper, (await quoteFor({ ...shopper.cart, couponId: null })).quote.totals.grandTotalPaise)
    if (!placed.ok) throw new Error(placed.error)
    await confirmPayment(payload, { razorpayOrderId: placed.order.razorpayOrderId, razorpayPaymentId: `pay_FIRST${stamp}` })

    const next = await findOrCreateCart(payload, shopper.customer.id)
    await addToCart(payload, async () => next, variant.id, 1)
    const result = await applyCoupon(payload, next, welcome.code)
    expect(result).toMatchObject({ ok: false, error: 'This code is for your first order only.' })
  })
})
