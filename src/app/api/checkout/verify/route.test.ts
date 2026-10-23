import { createHmac } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ customer: vi.fn(), payment: vi.fn(), confirm: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/storefront/customer', () => ({ getCurrentCustomer: mocks.customer }))
vi.mock('@/lib/request-security', () => ({ guardMutation: async () => null }))
vi.mock('@/lib/checkout', () => ({ confirmPayment: mocks.confirm }))
vi.mock('@/lib/storefront/queries', () => ({ getPayloadClient: async () => ({ find: mocks.find, logger: { error: vi.fn() } }) }))
vi.mock('@/lib/razorpay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/razorpay')>()),
  razorpayKeys: () => ({ keyId: 'rzp_test_key', keySecret: 'secret', webhookSecret: 'hook' }),
  fetchPayment: mocks.payment,
}))

import { POST } from './route'

const ids = { razorpayOrderId: 'order_ABC123', razorpayPaymentId: 'pay_XYZ789' }
const signature = createHmac('sha256', 'secret').update(`${ids.razorpayOrderId}|${ids.razorpayPaymentId}`).digest('hex')
const request = (body: object = { ...ids, signature }) =>
  new Request('http://localhost:3000/api/checkout/verify', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const captured = { id: ids.razorpayPaymentId, order_id: ids.razorpayOrderId, amount: 320_000, currency: 'INR', status: 'captured' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.customer.mockResolvedValue({ id: 7 })
  mocks.payment.mockResolvedValue(captured)
  mocks.find.mockResolvedValue({ docs: [{ orderNumber: 'PT-2627-000001' }] })
  mocks.confirm.mockResolvedValue({ status: 'CONFIRMED', order: { orderNumber: 'PT-2627-000001', customer: 7 } })
})

describe('payment verification', () => {
  it('refuses a forged signature without asking Razorpay or touching the order', async () => {
    expect((await POST(request({ ...ids, signature: 'a'.repeat(64) }))).status).toBe(400)
    expect(mocks.payment).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('confirms a captured payment for the amount Razorpay reports', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.confirm.mock.calls[0][1]).toEqual({ ...ids, amountPaise: 320_000 })
  })

  it('leaves an authorised-but-uncaptured payment for the webhook, and sends the shopper to wait', async () => {
    mocks.payment.mockResolvedValue({ ...captured, status: 'authorized' })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ orderNumber: 'PT-2627-000001', status: 'PENDING' })
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('waits for the webhook when Razorpay cannot be reached', async () => {
    mocks.payment.mockRejectedValue(new Error('timeout'))
    expect(await (await POST(request())).json()).toMatchObject({ status: 'PENDING' })
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('refuses a payment that belongs to another order or another currency', async () => {
    mocks.payment.mockResolvedValue({ ...captured, order_id: 'order_OTHER' })
    expect((await POST(request())).status).toBe(400)
    mocks.payment.mockResolvedValue({ ...captured, currency: 'USD' })
    expect((await POST(request())).status).toBe(400)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('refuses a failed payment', async () => {
    mocks.payment.mockResolvedValue({ ...captured, status: 'failed' })
    expect((await POST(request())).status).toBe(400)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
