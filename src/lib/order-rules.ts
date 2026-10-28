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

export type StatusEmail = 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'

/**
 * The email a status change sends the customer, if any. Only a real change
 * sends one, so saving an order again never repeats it. A cancellation is
 * news only for an order that was paid: an unpaid one that expired or was
 * replaced by a newer checkout cancels quietly.
 */
export const statusEmailFor = (from: OrderStatus, to: OrderStatus): StatusEmail | null => {
  if (from === to) return null
  switch (to) {
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERED':
    case 'RETURNED':
      return to
    case 'CANCELLED':
      return from === 'CONFIRMED' || from === 'PACKED' ? 'CANCELLED' : null
    default:
      return null
  }
}

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
  // Set by the code that cancels; staff cancelling is recorded as STAFF by the hook.
  'cancelReason',
] as const
