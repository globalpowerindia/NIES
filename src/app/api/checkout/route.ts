import type { NextResponse } from 'next/server'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { placeOrder } from '@/lib/checkout'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { placeOrderSchema } from '@/lib/validations/checkout'

/**
 * Places the order for the signed-in customer's cart and opens its Razorpay
 * order. The reply carries only what Checkout.js needs; the amount comes from
 * the server's own pricing, never from the request.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const denied = await guardMutation(request, 'checkout', LIMITS.checkout)
  if (denied) return denied

  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in to check out.')

  const parsed = placeOrderSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const payload = await getPayloadClient()
  const limited = await rateLimit(payload, `checkout:customer:${customer.id}`, LIMITS.checkout)
  if (!limited.ok) return fail(429, 'Too many checkout attempts. Please wait a few minutes and try again.')

  const result = await placeOrder(payload, {
    customer,
    addressId: parsed.data.addressId,
    email: parsed.data.email,
    gstin: parsed.data.gstin ?? null,
    expectedTotalPaise: parsed.data.expectedTotalPaise,
  })
  if (!result.ok) return fail(result.status, result.error, undefined, result.code ? { code: result.code } : undefined)

  return ok({
    orderNumber: result.order.orderNumber,
    razorpay: {
      keyId: result.keyId,
      orderId: result.order.razorpayOrderId,
      amountPaise: result.order.amountPaise,
      currency: 'INR',
      expiresAt: result.order.expiresAt,
    },
  })
}
