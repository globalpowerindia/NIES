import type { CollectionConfig } from 'payload'

import { isManager, isSuperAdmin } from '@/access/roles'

/**
 * One row per customer sign-in. The session cookie names its row, and a token
 * is honoured only while that row exists, is unexpired and not revoked — so
 * signing out ends the session on the server, not just in this browser, and
 * "sign out everywhere" (or a manager blocking an account) ends all of them.
 * See `src/lib/session.ts`.
 *
 * Hidden from the admin: managers revoke sessions by blocking the customer.
 */
export const CustomerSessions: CollectionConfig = {
  slug: 'customer-sessions',
  labels: { singular: 'Customer session', plural: 'Customer sessions' },
  admin: { hidden: true },
  access: {
    // Created and revoked only through our own handlers via the Local API.
    read: isManager,
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'revokedAt', type: 'date' },
  ],
}
