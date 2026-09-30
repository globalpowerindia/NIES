import type { CollectionConfig } from 'payload'

import { isStaff, isSuperAdmin } from '@/access/roles'

export const AUTH_PROVIDERS = ['PHONE_OTP', 'EMAIL_OTP', 'GOOGLE'] as const

export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

/**
 * One row per way a customer can prove who they are. A single customer may
 * have all three: a code texted to their phone, a code emailed to them, and a
 * Google account.
 *
 * `providerAccountId` is the stable identifier for that provider — the E.164
 * phone for PHONE_OTP, the email for EMAIL_OTP, and Google's `sub` for GOOGLE.
 * Note it is the `sub`, never the Google email: emails get reassigned inside
 * workspaces, `sub` does not.
 *
 * There are no passwords. Every method proves control of something at the
 * moment of sign-in, so there is nothing stored here worth stealing.
 *
 * Nothing here is writable from the storefront; `resolveIdentity()` owns it.
 */
export const AuthIdentities: CollectionConfig = {
  slug: 'auth-identities',
  labels: { singular: 'Login method', plural: 'Login methods' },
  admin: {
    useAsTitle: 'providerAccountId',
    group: 'Customers',
    defaultColumns: ['provider', 'providerAccountId', 'customer', 'lastUsedAt'],
    description: 'How each customer signs in. Created by the login flows, not by hand.',
  },
  access: {
    read: isStaff,
    // Created and updated only through the Local API in our own auth handlers,
    // which bypasses access control. Nothing in the admin should forge one.
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  indexes: [{ fields: ['provider', 'providerAccountId'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          type: 'select',
          required: true,
          options: [
            { label: 'Mobile OTP', value: 'PHONE_OTP' },
            { label: 'Email OTP', value: 'EMAIL_OTP' },
            { label: 'Google', value: 'GOOGLE' },
          ],
          admin: { width: '30%' },
        },
        {
          name: 'providerAccountId',
          type: 'text',
          required: true,
          index: true,
          admin: { width: '70%', description: 'E.164 phone, email, or Google subject id.' },
        },
      ],
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    { name: 'lastUsedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
}
