import type { CollectionConfig } from 'payload'

import { isStaff, isSuperAdmin } from '@/access/roles'

/**
 * One variant in a cart. Price is deliberately not stored: the cart always
 * shows today's price, and the order snapshots it at checkout.
 */
export const CartItems: CollectionConfig = {
  slug: 'cart-items',
  labels: { singular: 'Cart item', plural: 'Cart items' },
  admin: {
    group: 'Commerce',
    hidden: true,
    defaultColumns: ['cart', 'variant', 'quantity', 'updatedAt'],
  },
  access: {
    read: isStaff,
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  // Adding the same variant twice changes one line, enforced by the database
  // rather than a read-then-write race between two quick clicks.
  indexes: [{ fields: ['cart', 'variant'], unique: true }],
  fields: [
    { name: 'cart', type: 'relationship', relationTo: 'carts', required: true, index: true },
    { name: 'variant', type: 'relationship', relationTo: 'product-variants', required: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'quantity', type: 'number', required: true, min: 1, admin: { step: 1 } },
  ],
}
