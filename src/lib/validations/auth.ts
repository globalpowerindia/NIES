import { z } from 'zod'

/**
 * What the auth endpoints accept. Kept apart from the handlers so the same
 * rules can back the forms later without drifting.
 */

/**
 * Length beats composition rules: a 12-character passphrase is stronger than
 * "Pa$$w0rd" and far likelier to be remembered rather than reused. The cap is
 * bcrypt's, which silently truncates beyond 72 bytes — better to reject than
 * to quietly ignore the tail of someone's password.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72, 'Use at most 72 characters.')

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

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  acceptsMarketing: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(72),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
