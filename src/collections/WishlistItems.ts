import type { CollectionConfig } from 'payload'

import { isStaff, isSuperAdmin } from '@/access/roles'

/**
 * One row per product a customer has hearted. Written only by
 * /api/account/wishlist; read-only in the admin, where it shows staff what
 * people are saving for later.
 */
export const WishlistItems: CollectionConfig = {
  slug: 'wishlist-items',
  labels: { singular: 'Wishlist item', plural: 'Wishlist items' },
  admin: {
    group: 'Customers',
    defaultColumns: ['customer', 'product', 'createdAt'],
  },
  access: {
    read: isStaff,
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  // Hearting the same product twice is one row, enforced by the database
  // rather than a read-then-write race.
  indexes: [{ fields: ['customer', 'product'], unique: true }],
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
  ],
}
