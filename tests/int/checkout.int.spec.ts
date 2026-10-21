import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Category, Product } from '@/payload-types'

// Razorpay is the only thing faked: its keys, and the network calls behind them.
const razorpay = vi.hoisted(() => ({ orders: 0, payments: [] as { id: string; status: string; amount: number }[] }))
vi.mock('@/lib/razorpay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/razorpay')>()),
  razorpayKeys: () => ({ keyId: 'rzp_test_key', keySecret: 'secret', webhookSecret: 'hook' }),
  createRazorpayOrder: async () => ({ id: `order_TEST${Date.now()}${++razorpay.orders}`, amount: 0, currency: 'INR', status: 'created' }),
  fetchOrderPayments: async () => razorpay.payments,
}))

const { confirmPayment, expireUnpaidOrders, placeOrder, quoteCheckout } = await import('@/lib/checkout')
const { addToCart, findOrCreateCart, loadCartView } = await import('@/lib/storefront/cart')

let payload: Payload
const stamp = Date.now()
const created: { collection: 'customers' | 'products' | 'categories'; id: number }[] = []

const stockOf = async (variantId: number) => {
  const { docs } = await payload.find({ collection: 'inventory', where: { variant: { equals: variantId } }, depth: 0, overrideAccess: true })
  return { onHand: Number(docs[0].onHand), reserved: Number(docs[0].reserved) }
}

const fixture = async (onHand: number, sellOnline = true) => {
  const n = created.length
  const category = await payload.create({ collection: 'categories', data: { name: `Checkout test ${stamp}-${n}` } as Category, overrideAccess: true })
  created.push({ collection: 'categories', id: category.id })
  const product = await payload.create({
    collection: 'products',
    // Slug and search text are filled in by hooks.
    data: { name: `Checkout drill ${stamp}-${n}`, status: 'ACTIVE', sellOnline, category: category.id, hsnCode: '8467', gstRateBps: 1800 } as Product,
    overrideAccess: true,
  })
  created.push({ collection: 'products', id: product.id })
  const variant = await payload.create({
    collection: 'product-variants',
    data: { product: product.id, sku: `CHK-${stamp}-${n}`, name: 'Standard', mrpPaise: 200_000, sellingPricePaise: 150_000, isActive: true, weightGrams: 3000 },
    overrideAccess: true,
  })
  await payload.create({ collection: 'stock-movements', data: { variant: variant.id, type: 'RECEIVED', quantity: onHand }, overrideAccess: true })

  const customer = await payload.create({
    collection: 'customers',
    data: { email: `checkout-${stamp}-${n}@example.test`, status: 'ACTIVE' },
    overrideAccess: true,
  })
  created.push({ collection: 'customers', id: customer.id })
  const address = await payload.create({
    collection: 'addresses',
    data: { customer: customer.id, fullName: 'Asha Menon', phone: '+919876543210', line1: '12 MG Road', line2: 'Ravipuram', city: 'Kochi', pincode: '682016', stateCode: '32', type: 'HOME' },
    overrideAccess: true,
  })
  const cart = await findOrCreateCart(payload, customer.id)
  await addToCart(payload, async () => cart, variant.id, 2)
  return { customer, address, variant, product, cart }
}

const place = async (f: Awaited<ReturnType<typeof fixture>>, expected?: number) => {
  const view = await loadCartView(payload, f.cart)
  const quote = await quoteCheckout(payload, view, f.address.stateCode)
  return placeOrder(payload, {
    customer: f.customer,
    addressId: f.address.id,
    email: 'asha@example.test',
    gstin: null,
    expectedTotalPaise: expected ?? quote.totals.grandTotalPaise,
  })
}

describe('Checkout', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.updateGlobal({
      slug: 'checkout-settings',
      data: {
        shippingSlabs: [{ maxWeightKg: 10, withinStatePaise: 20_000, otherStatesPaise: 40_000 }],
        extraPerKgWithinStatePaise: 1_000,
        extraPerKgOtherStatesPaise: 2_000,
        defaultWeightKg: 5,
      },
      overrideAccess: true,
    })
  })

  beforeEach(() => {
    razorpay.payments = []
  })

  afterAll(async () => {
    for (const { collection, id } of created.reverse()) {
      if (collection === 'customers') {
        await payload.delete({ collection: 'orders', where: { customer: { equals: id } }, overrideAccess: true })
        await payload.delete({ collection: 'carts', where: { customer: { equals: id } }, overrideAccess: true })
        await payload.delete({ collection: 'addresses', where: { customer: { equals: id } }, overrideAccess: true })
      }
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('places an order: weight-based delivery, GST by state, stock held, a numbered order awaiting payment', async () => {
    const f = await fixture(5)
    const result = await place(f)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const order = await payload.findByID({ collection: 'orders', id: result.order.orderId, overrideAccess: true })
    expect(order.status).toBe('PENDING_PAYMENT')
    expect(order.orderNumber).toMatch(/^PT-\d{4}-\d{6}$/)
    expect(order.invoiceNumber).toBeFalsy()
    expect(order.shippingWeightGrams).toBe(6000)
    expect(order.shippingPaise).toBe(20_000)
    expect(order.grandTotalPaise).toBe(2 * 150_000 + 20_000)
    expect(order.igstPaise).toBe(0)
    expect((order.cgstPaise ?? 0) + (order.sgstPaise ?? 0)).toBeGreaterThan(0)
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 5, reserved: 2 })
  })

  it('reuses the open order on a retry instead of holding stock twice', async () => {
    const f = await fixture(5)
    const first = await place(f)
    const second = await place(f)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.order.orderNumber).toBe(first.order.orderNumber)
    expect(second.order.razorpayOrderId).toBe(first.order.razorpayOrderId)
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 5, reserved: 2 })
  })

  it('refuses to charge a total the shopper did not see', async () => {
    const f = await fixture(5)
    const result = await place(f, 1)
    expect(result).toMatchObject({ ok: false, status: 409, code: 'TOTAL_CHANGED' })
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 5, reserved: 0 })
  })

  it('confirms once when the browser and the webhook report the same payment together', async () => {
    const f = await fixture(5)
    const placed = await place(f)
    if (!placed.ok) throw new Error(placed.error)
    const input = { razorpayOrderId: placed.order.razorpayOrderId, razorpayPaymentId: `pay_TEST${stamp}` }

    const results = await Promise.all([
      confirmPayment(payload, input),
      confirmPayment(payload, { ...input, amountPaise: placed.order.amountPaise }),
    ])
    expect(results.map((result) => result.status).sort()).toEqual(['ALREADY_CONFIRMED', 'CONFIRMED'])

    const order = await payload.findByID({ collection: 'orders', id: placed.order.orderId, overrideAccess: true })
    expect(order.status).toBe('CONFIRMED')
    expect(order.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/)
    expect(order.paidAt).toBeTruthy()
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 3, reserved: 0 })

    const cart = await payload.findByID({ collection: 'carts', id: f.cart.id, overrideAccess: true })
    expect(cart.status).toBe('CONVERTED')
  })

  it('refuses a webhook amount that does not match the order', async () => {
    const f = await fixture(5)
    const placed = await place(f)
    if (!placed.ok) throw new Error(placed.error)
    const result = await confirmPayment(payload, {
      razorpayOrderId: placed.order.razorpayOrderId,
      razorpayPaymentId: `pay_WRONG${stamp}`,
      amountPaise: 100,
    })
    expect(result.status).toBe('AMOUNT_MISMATCH')
  })

  it('cancels an order nobody paid for in time and gives its stock back', async () => {
    const f = await fixture(5)
    const placed = await place(f)
    if (!placed.ok) throw new Error(placed.error)
    await payload.update({
      collection: 'orders',
      id: placed.order.orderId,
      data: { paymentExpiresAt: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })

    await expireUnpaidOrders(payload)

    const order = await payload.findByID({ collection: 'orders', id: placed.order.orderId, overrideAccess: true })
    expect(order.status).toBe('CANCELLED')
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 5, reserved: 0 })
  })

  it('confirms instead of cancelling when Razorpay shows the payment landed', async () => {
    const f = await fixture(5)
    const placed = await place(f)
    if (!placed.ok) throw new Error(placed.error)
    await payload.update({
      collection: 'orders',
      id: placed.order.orderId,
      data: { paymentExpiresAt: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    razorpay.payments = [{ id: `pay_LATE${stamp}`, status: 'captured', amount: placed.order.amountPaise }]

    await expireUnpaidOrders(payload)

    const order = await payload.findByID({ collection: 'orders', id: placed.order.orderId, overrideAccess: true })
    expect(order.status).toBe('CONFIRMED')
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 3, reserved: 0 })
  })

  it('refuses to add a product that is sold on enquiry only', async () => {
    const f = await fixture(5, false)
    const change = await addToCart(payload, async () => f.cart, f.variant.id, 1)
    expect(change).toMatchObject({ ok: false, status: 409 })
    expect((await loadCartView(payload, f.cart)).lines).toHaveLength(0)
  })

  it('blocks checkout when a product in the cart is switched to enquiry only', async () => {
    const f = await fixture(5)
    await payload.update({ collection: 'products', id: f.product.id, data: { sellOnline: false }, overrideAccess: true })
    const result = await place(f)
    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 5, reserved: 0 })
  })

  it('revives an expired order when its payment arrives late and the stock is still there', async () => {
    const f = await fixture(5)
    const placed = await place(f)
    if (!placed.ok) throw new Error(placed.error)
    await payload.update({ collection: 'orders', id: placed.order.orderId, data: { status: 'CANCELLED' }, overrideAccess: true })
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 5, reserved: 0 })

    const result = await confirmPayment(payload, {
      razorpayOrderId: placed.order.razorpayOrderId,
      razorpayPaymentId: `pay_REVIVE${stamp}`,
    })
    expect(result.status).toBe('CONFIRMED')
    expect(await stockOf(f.variant.id)).toEqual({ onHand: 3, reserved: 0 })
  })
})
