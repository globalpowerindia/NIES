import { NextResponse } from 'next/server'

import { confirmPayment } from '@/lib/checkout'
import { razorpayKeys, verifyWebhookSignature } from '@/lib/razorpay'
import { getPayloadClient } from '@/lib/storefront/queries'

type PaymentEntity = { id: string; order_id: string; amount: number; status: string }
type WebhookEvent = { event: string; payload?: { payment?: { entity?: PaymentEntity } } }

/**
 * Razorpay's server-to-server report of a payment, so an order is confirmed
 * even when the shopper closes the tab before the browser reports back.
 * Configure in Dashboard → Webhooks: this URL, the RAZORPAY_WEBHOOK_SECRET,
 * and the `payment.captured` and `order.paid` events.
 *
 * Razorpay retries anything but a 2xx, so a valid event we don't act on still
 * gets 200; only a bad signature (not from Razorpay) is refused.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const keys = razorpayKeys()
  if (!keys?.webhookSecret) return NextResponse.json({ ok: false }, { status: 503 })

  const rawBody = await request.text()
  if (rawBody.length > 256 * 1024) return NextResponse.json({ ok: false }, { status: 413 })
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  if (!verifyWebhookSignature(keys.webhookSecret, rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  let event: WebhookEvent
  try {
    event = JSON.parse(rawBody) as WebhookEvent
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const payment = event.payload?.payment?.entity
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id && payment.status === 'captured') {
    const payload = await getPayloadClient()
    const result = await confirmPayment(payload, {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amountPaise: payment.amount,
    })
    if (result.status === 'NOT_FOUND' || result.status === 'AMOUNT_MISMATCH') {
      payload.logger.error({ event: event.event, payment: payment.id, result: result.status }, 'Razorpay webhook could not be applied')
    }
  }
  return NextResponse.json({ ok: true })
}
