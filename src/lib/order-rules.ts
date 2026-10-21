import type { OrderStatus } from '@/collections/Orders'

/**
 * Where an order may go next when staff move it. Confirming is not here:
 * an order is confirmed by payment capture (system code, no staff user), so a
 * click in the admin can't mark an unpaid order as paid. Cancelled and
 * returned are final.
 */
const STAFF_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
}

export const staffCanMoveOrder = (from: OrderStatus, to: OrderStatus): boolean =>
  from === to || STAFF_TRANSITIONS[from].includes(to)

/**
 * What the customer was charged, and for what. Fixed once the order exists:
 * a correction is a cancellation or a return, never an edit, so the GST
 * invoice always matches the payment.
 */
export const LOCKED_ORDER_FIELDS = [
  'orderNumber',
  'invoiceNumber',
  'placedAt',
  'customer',
  'items',
  'subtotalPaise',
  'discountPaise',
  'shippingPaise',
  'taxablePaise',
  'cgstPaise',
  'sgstPaise',
  'igstPaise',
  'grandTotalPaise',
  'paymentMethod',
  'razorpayOrderId',
  'razorpayPaymentId',
  'paymentExpiresAt',
  'paidAt',
  'coupon',
  'couponCode',
  'deliveryDiscountPaise',
  'shippingWeightGrams',
  'cart',
  'confirmationEmailSentAt',
] as const
