import type { CollectionConfig } from 'payload'

import { isManager, isStaff, isSuperAdmin } from '@/access/roles'

/**
 * The person. Deliberately NOT a Payload auth collection: staff log in through
 * Payload at /admin, customers through our own `session_token` JWT. Keeping the
 * realms in separate systems makes privilege escalation structurally
 * impossible rather than one missing role-check away.
 *
 * Payload only stores and displays customers, which is what support staff need.
 * Every customer-facing write goes through our own /api handlers.
 *
 * Email and phone are both optional: a phone-OTP customer may never give an
 * email, and a Google customer may never give a phone. At least one is
 * guaranteed by the login flow that created them, not by this schema.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: false,
  labels: { singular: 'Customer', plural: 'Customers' },
  admin: {
    useAsTitle: 'email',
    group: 'Customers',
    defaultColumns: ['email', 'phone', 'firstName', 'lastName', 'createdAt'],
    description: 'Shoppers. Staff accounts live under Users.',
  },
  access: {
    // Never `anyone`: this is personal data. The storefront reads customers
    // through the Local API, which bypasses access control by design.
    read: isStaff,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', admin: { width: '50%' } },
        { name: 'lastName', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        // Not `unique`. Two customers may hold the same email string while
        // only one has verified it — an unverified address is a claim, not
        // ownership. Making it unique let an attacker squat an unverified
        // password account on someone's email and lock them out of Google
        // sign-in forever. `resolveIdentity` enforces one *verified* owner.
        {
          name: 'email',
          type: 'email',
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'phone',
          type: 'text',
          index: true,
          admin: {
            width: '50%',
            description: 'E.164, e.g. +919876543210.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'emailVerifiedAt',
          type: 'date',
          admin: {
            width: '50%',
            readOnly: true,
            description: 'Set only by clicking a verification link. Gates account linking.',
          },
        },
        {
          name: 'phoneVerifiedAt',
          type: 'date',
          admin: { width: '50%', readOnly: true, description: 'Set only by a successful OTP.' },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ACTIVE',
      options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Blocked', value: 'BLOCKED' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'identities',
      type: 'join',
      collection: 'auth-identities',
      on: 'customer',
      admin: { defaultColumns: ['provider', 'providerAccountId', 'lastUsedAt'] },
    },
    {
      name: 'acceptsMarketing',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
}
