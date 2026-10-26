import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { confirmPayment } from '@/lib/checkout'
import { fetchPayment, razorpayKeys, verifyPaymentSignature } from '@/lib/razorpay'
import { LIMITS } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import { relId } from '@/lib/storefront/products'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { verifyPaymentSchema } from '@/lib/validations/checkout'

const NOT_VERIFIED = 'We couldn’t verify this payment. If money left your account, it will be confirmed or refunded automatically.'

/**
 * The browser's half of payment confirmation: Checkout.js's signed success
 * result. The signature proves Razorpay authorised this payment for this
 * order, but not that it was captured or for how much, so those come from
 * Razorpay itself before the order is confirmed. The webhook confirms the same
 * payment independently, in case this request never arrives.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = await guardMutation(request, 'checkoutVerify', LIMITS.cartWrite)
  if (denied) return denied

  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in again to see your order.')

  const parsed = verifyPaymentSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)
  const { razorpayOrderId, razorpayPaymentId } = parsed.data

  const keys = razorpayKeys()
  if (!keys || !verifyPaymentSignature(keys.keySecret, parsed.data)) return fail(400, NOT_VERIFIED)

  const payload = await getPayloadClient()
  const payment = await fetchPayment(keys, razorpayPaymentId).catch((err) => {
    payload.logger.error({ err, payment: razorpayPaymentId }, 'Could not fetch the payment from Razorpay')
    return null
  })
  if (payment && (payment.order_id !== razorpayOrderId || payment.currency !== 'INR')) {
    payload.logger.error({ payment: razorpayPaymentId, order: razorpayOrderId }, 'Signed payment does not match its order or currency')
    return fail(400, NOT_VERIFIED)
  }

  // Authorised but not captured yet, or Razorpay unreachable: the webhook confirms it once it is.
  // The order page waits for that, so send them there.
  if (!payment || payment.status === 'authorized') {
    const { docs } = await payload.find({
      collection: 'orders',
      where: { and: [{ razorpayOrderId: { equals: razorpayOrderId } }, { customer: { equals: customer.id } }] },
      limit: 1,
      depth: 0,
      select: { orderNumber: true },
      overrideAccess: true,
    })
    return docs[0] ? ok({ orderNumber: docs[0].orderNumber, status: 'PENDING' }) : fail(404, 'Order not found.')
  }
  if (payment.status !== 'captured') return fail(400, 'This payment wasn’t completed. Please try again.')

  const result = await confirmPayment(payload, { razorpayOrderId, razorpayPaymentId, amountPaise: payment.amount })
  if (!('order' in result)) {
    return fail(409, 'We received your payment but couldn’t match it to an order. Our team has been alerted and will contact you.')
  }
  if (relId(result.order.customer) !== customer.id) return fail(404, 'Order not found.')
  if (result.status === 'NEEDS_REFUND') {
    return fail(409, 'Your payment arrived after this order was closed, so we couldn’t accept it. We’ll refund the full amount within 5–7 working days.')
  }

  return ok({ orderNumber: result.order.orderNumber, status: result.status })
}
