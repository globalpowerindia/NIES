import { z } from 'zod'

/** What the checkout page sends to place an order. */
export const placeOrderSchema = z.object({
  addressId: z.number({ error: 'Choose a delivery address.' }).int().positive('Choose a delivery address.'),
  email: z
    .string({ error: 'Enter your email for the order receipt.' })
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.')
    .max(254),
  // GSTIN: 2-digit state, 10-character PAN, entity number, Z, checksum.
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN, or leave it empty.')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  expectedTotalPaise: z.number().int().nonnegative(),
})

/** What Checkout.js hands the page after a successful payment. */
export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  signature: z.string().regex(/^[0-9a-f]{64}$/i),
})
