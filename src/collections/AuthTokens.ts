import type { CollectionConfig } from 'payload'

import { isSuperAdmin } from '@/access/roles'

export const AUTH_TOKEN_PURPOSES = ['EMAIL_VERIFY', 'PASSWORD_RESET'] as const

export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number]

/**
 * One-shot links: verify this email, reset this password.
 *
 * Only a SHA-256 of the token is stored, never the token itself, so a leaked
 * database backup cannot be replayed into someone's account. Rows are consumed
 * on first use rather than merely checked, which is what makes a forwarded or
 * logged reset link harmless after the fact.
 *
 * Hidden from the admin: there is nothing here staff can act on, and the
 * contents are security-sensitive.
 */
export const AuthTokens: CollectionConfig = {
  slug: 'auth-tokens',
  labels: { singular: 'Auth token', plural: 'Auth tokens' },
  admin: { hidden: true, useAsTitle: 'purpose' },
  access: {
    // Issued and consumed only through our own auth handlers via the Local
    // API. Nothing should read these, including staff.
    read: isSuperAdmin,
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'purpose',
      type: 'select',
      required: true,
      options: [
        { label: 'Verify email', value: 'EMAIL_VERIFY' },
        { label: 'Reset password', value: 'PASSWORD_RESET' },
      ],
    },
    { name: 'tokenHash', type: 'text', required: true, index: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    {
      name: 'email',
      type: 'text',
      required: true,
      admin: { description: 'The address this link was sent to, frozen at issue time.' },
    },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'consumedAt', type: 'date' },
  ],
}
