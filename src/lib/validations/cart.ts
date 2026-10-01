import { z } from 'zod'

import { MAX_LINE_QTY } from '@/lib/cart-rules'

const quantity = z
  .number({ error: 'Choose a quantity.' })
  .int('Choose a whole number.')
  .min(1, 'Choose at least 1.')
  .max(MAX_LINE_QTY, `You can buy up to ${MAX_LINE_QTY} at a time.`)

/** Product cards and the wishlist send a product; the product page sends the variant on show. */
export const addToCartSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    variantId: z.number().int().positive().optional(),
    quantity: quantity.default(1),
  })
  .refine((value) => value.productId || value.variantId, {
    message: 'Choose a product.',
    path: ['productId'],
  })

/** 0 removes the line. */
export const setQuantitySchema = z.object({
  quantity: z
    .number()
    .int()
    .min(0)
    .max(MAX_LINE_QTY, `You can buy up to ${MAX_LINE_QTY} at a time.`),
})

export const couponSchema = z.object({
  code: z
    .string({ error: 'Enter a code.' })
    .trim()
    .min(1, 'Enter a code.')
    .max(40, "This code isn't valid."),
})
