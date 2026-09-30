import { z } from 'zod'

import { ADDRESS_TYPES } from '@/collections/Addresses'
import { normalisePhone } from '@/lib/identity'
import { isStateCode } from '@/lib/indian-states'
import { phoneSchema } from '@/lib/validations/auth'

/** What the My Address form sends. Field names match the `addresses` collection. */
export const addressSchema = z.object({
  fullName: z
    .string({ error: 'Enter the full name.' })
    .trim()
    .min(1, 'Enter the full name.')
    .max(80),
  // Spaces are fine to type ("98765 43210"); stored as +91XXXXXXXXXX.
  phone: z
    .string({ error: 'Enter a mobile number.' })
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(phoneSchema)
    .transform(normalisePhone),
  pincode: z
    .string({ error: 'Enter the PIN code.' })
    .trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code.'),
  line1: z
    .string({ error: 'Enter the flat, house or building.' })
    .trim()
    .min(1, 'Enter the flat, house or building.')
    .max(120),
  line2: z
    .string({ error: 'Enter the area or street.' })
    .trim()
    .min(1, 'Enter the area or street.')
    .max(120),
  city: z.string({ error: 'Enter the city.' }).trim().min(1, 'Enter the city.').max(60),
  stateCode: z.string({ error: 'Choose the state.' }).refine(isStateCode, 'Choose the state.'),
  type: z.enum(ADDRESS_TYPES).default('HOME'),
})

export type AddressInput = z.infer<typeof addressSchema>

export const wishlistSchema = z.object({ productId: z.number().int().positive() })
