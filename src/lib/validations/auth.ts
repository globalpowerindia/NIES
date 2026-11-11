import { z } from 'zod'

/** What the auth endpoints accept. Kept apart from the handlers so every route reads the same rules. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254)

/** Indian mobile numbers, with or without +91 / leading zero. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?91)?[0\s-]*([6-9]\d{9})$/, 'Enter a valid 10-digit Indian mobile number.')

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code.')

/**
 * `link` is the Google follow-up step: the phone is being added to an account
 * that is waiting to finish signing in, rather than used to sign in itself.
 * `change` adds or replaces the number or email on the signed-in customer's profile.
 */
const purposeSchema = z.enum(['signin', 'link', 'change']).default('signin')
const emailPurposeSchema = z.enum(['signin', 'change']).default('signin')

/** Cloudflare Turnstile's token, required only while Turnstile is configured. */
const captchaSchema = z.string().max(2048).optional()

export const otpRequestSchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('sms'), destination: phoneSchema, purpose: purposeSchema, captchaToken: captchaSchema }),
  z.object({
    channel: z.literal('email'),
    destination: emailSchema,
    purpose: emailPurposeSchema,
    captchaToken: captchaSchema,
  }),
])

export const otpVerifySchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('sms'), destination: phoneSchema, code: codeSchema, purpose: purposeSchema }),
  z.object({
    channel: z.literal('email'),
    destination: emailSchema,
    code: codeSchema,
    purpose: emailPurposeSchema,
  }),
])

export const profileSchema = z.object({
  firstName: z.string({ error: 'Enter your first name.' }).trim().min(1, 'Enter your first name.').max(60),
  lastName: z.string().trim().max(60).optional(),
})
