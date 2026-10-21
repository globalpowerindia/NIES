import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { confirmPayment } from '@/lib/checkout'
import { razorpayKeys, verifyPaymentSignature } from '@/lib/razorpay'
import { LIMITS } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import { relId } from '@/lib/storefront/products'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { verifyPaymentSchema } from '@/lib/validations/checkout'

/**
 * The browser's half of payment confirmation: Checkout.js's signed success
 * result. The signature proves Razorpay took this payment for this order, so
 * nothing else from the browser is trusted. The webhook confirms the same
 * payment independently, in case this request never arrives.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = await guardMutation(request, 'checkoutVerify', LIMITS.cartWrite)
  if (denied) return denied

  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in again to see your order.')

  const parsed = verifyPaymentSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const keys = razorpayKeys()
  if (!keys || !verifyPaymentSignature(keys.keySecret, parsed.data)) {
    return fail(400, 'We couldn’t verify this payment. If money left your account, it will be confirmed or refunded automatically.')
  }

  const payload = await getPayloadClient()
  const result = await confirmPayment(payload, {
    razorpayOrderId: parsed.data.razorpayOrderId,
    razorpayPaymentId: parsed.data.razorpayPaymentId,
  })
  if (!('order' in result)) {
    return fail(409, 'We received your payment but couldn’t match it to an order. Our team has been alerted and will contact you.')
  }
  if (relId(result.order.customer) !== customer.id) return fail(404, 'Order not found.')
  if (result.status === 'NEEDS_REFUND') {
    return fail(409, 'Your payment arrived after your items were released, and one of them has since sold out. We’ll refund the full amount within 5–7 working days.')
  }

  return ok({ orderNumber: result.order.orderNumber, status: result.status })
}
