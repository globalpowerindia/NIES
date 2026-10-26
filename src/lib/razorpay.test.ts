import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({ env: {} }))

const { verifyPaymentSignature, verifyWebhookSignature } = await import('@/lib/razorpay')

const sign = (secret: string, message: string) => createHmac('sha256', secret).update(message).digest('hex')

describe('verifyPaymentSignature', () => {
  const input = { razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ' }

  it('accepts the signature Razorpay computes', () => {
    expect(verifyPaymentSignature('secret', { ...input, signature: sign('secret', 'order_ABC|pay_XYZ') })).toBe(true)
  })

  it('refuses a signature for another payment, another secret, or garbage', () => {
    expect(verifyPaymentSignature('secret', { ...input, signature: sign('secret', 'order_ABC|pay_OTHER') })).toBe(false)
    expect(verifyPaymentSignature('secret', { ...input, signature: sign('other', 'order_ABC|pay_XYZ') })).toBe(false)
    expect(verifyPaymentSignature('secret', { ...input, signature: 'not-hex' })).toBe(false)
    expect(verifyPaymentSignature('secret', { ...input, signature: '' })).toBe(false)
  })
})

describe('verifyWebhookSignature', () => {
  it('checks the raw body byte for byte', () => {
    const body = '{"event":"payment.captured"}'
    expect(verifyWebhookSignature('hook', body, sign('hook', body))).toBe(true)
    expect(verifyWebhookSignature('hook', `${body} `, sign('hook', body))).toBe(false)
  })
})
