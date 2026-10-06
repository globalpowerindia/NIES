import type { CollectionConfig } from 'payload'

import { isManager, isStaff, isSuperAdmin } from '@/access/roles'
import { revokeAllSessions } from '@/lib/customer-sessions'

/**
 * The person. Deliberately NOT a Payload auth collection: staff log in through
 * Payload at /admin, customers through our own `session_token` JWT. Keeping the
 * realms separate prevents customer sessions from authenticating as staff.
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
  hooks: {
    // Sessions can't outlive their customer (the column is required).
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({ collection: 'customer-sessions', where: { customer: { equals: id } }, overrideAccess: true, req })
      },
    ],
    // Blocking someone signs them out everywhere, not just on their next request.
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.status === 'BLOCKED' && previousDoc?.status !== 'BLOCKED') {
          await revokeAllSessions(req.payload, doc.id, req)
        }
        return doc
      },
    ],
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
        // Not `unique`. Uniqueness here would let whoever wrote an address
        // first — say staff keying in a phone order — lock its real owner out
        // of signing in with it. `resolveIdentity` enforces one *verified*
        // owner instead, releasing the address from anyone who never proved it.
        {
          name: 'email',
          type: 'email',
          access: { update: () => false },
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'phone',
          type: 'text',
          access: { update: () => false },
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
          access: { create: () => false, update: () => false },
          admin: {
            width: '50%',
            readOnly: true,
            description: 'Set only when the customer proves this address: an emailed code, or Google. Gates account linking.',
          },
        },
        {
          name: 'phoneVerifiedAt',
          type: 'date',
          access: { create: () => false, update: () => false },
          admin: { width: '50%', readOnly: true, description: 'Set only by a correct SMS code. Gates account linking.' },
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
