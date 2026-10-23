import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

/**
 * Razorpay over its REST API: three calls, so no SDK. The key secret never
 * leaves the server; the browser only ever sees the key id and an order id.
 *
 * Auto-capture must be on (Dashboard → Account & Settings → Payment capture),
 * so an authorised payment is captured without a second call from us.
 */

export type RazorpayKeys = { keyId: string; keySecret: string; webhookSecret: string | null }

/** Online payment is offered only once both halves of the API key are set. */
export const razorpayKeys = (): RazorpayKeys | null =>
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? null }
    : null

const API = 'https://api.razorpay.com/v1'

const call = async <T>(keys: RazorpayKeys, path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Razorpay ${init.method ?? 'GET'} ${path} failed: HTTP ${response.status} ${body.slice(0, 300)}`)
  }
  return (await response.json()) as T
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string }

export const createRazorpayOrder = (
  keys: RazorpayKeys,
  input: { amountPaise: number; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> =>
  call(keys, '/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes }),
  })

export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string }

/** One payment as Razorpay has it now: whether it was captured, for which order, and for how much. */
export const fetchPayment = (keys: RazorpayKeys, paymentId: string): Promise<RazorpayPayment> =>
  call(keys, `/payments/${encodeURIComponent(paymentId)}`)

/** Every attempt on an order, for reconciling before an unpaid order is given up on. */
export const fetchOrderPayments = async (keys: RazorpayKeys, razorpayOrderId: string): Promise<RazorpayPayment[]> =>
  (await call<{ items: RazorpayPayment[] }>(keys, `/orders/${encodeURIComponent(razorpayOrderId)}/payments`)).items

const hmacHex = (secret: string, message: string) => createHmac('sha256', secret).update(message).digest('hex')

const sameHex = (expected: string, received: string): boolean => {
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(received, 'hex')
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b)
}

/** The signature Checkout.js returns on success: HMAC of "order_id|payment_id" with the key secret. */
export const verifyPaymentSignature = (
  keySecret: string,
  input: { razorpayOrderId: string; razorpayPaymentId: string; signature: string },
): boolean =>
  /^[0-9a-f]+$/i.test(input.signature) &&
  sameHex(hmacHex(keySecret, `${input.razorpayOrderId}|${input.razorpayPaymentId}`), input.signature)

/** Webhooks are signed over the raw request body with the webhook secret (not the key secret). */
export const verifyWebhookSignature = (webhookSecret: string, rawBody: string, signature: string): boolean =>
  /^[0-9a-f]+$/i.test(signature) && sameHex(hmacHex(webhookSecret, rawBody), signature)
