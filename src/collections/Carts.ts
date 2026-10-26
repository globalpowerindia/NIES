import type { CollectionConfig } from 'payload'

import { allow } from '@/access/roles'

export const CART_STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Merged into account', value: 'MERGED' },
  { label: 'Ordered', value: 'CONVERTED' },
]

/**
 * A shopper's cart. A guest's is found by the random `token` in their
 * `cart_id` cookie; a signed-in customer's by `customer`. Written only by
 * /api/cart and the sign-in merge; read-only in the admin, where staff can see
 * what people are about to buy and which carts were left behind.
 *
 * Abandonment is a flag, not a status: a shopper who comes back days later
 * still finds their cart, and the flag clears the moment they touch it.
 */
export const Carts: CollectionConfig = {
  slug: 'carts',
  labels: { singular: 'Cart', plural: 'Carts' },
  admin: {
    group: 'Commerce',
    defaultColumns: ['id', 'customer', 'status', 'coupon', 'lastActivityAt', 'abandonedAt'],
    description:
      'Shoppers’ carts. Carts untouched for a day are flagged as abandoned but stay usable.',
  },
  access: {
    read: allow('carts', 'read'),
    create: () => false,
    update: () => false,
    delete: allow('carts', 'delete'),
  },
  hooks: {
    // An item can't outlive its cart (its `cart` is required), so they go first.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({
          collection: 'cart-items',
          where: { cart: { equals: id } },
          req,
          overrideAccess: true,
        })
      },
    ],
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      index: true,
      admin: { description: 'Empty for a guest cart.' },
    },
    {
      name: 'token',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ACTIVE',
      index: true,
      options: CART_STATUS_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'coupon',
      type: 'relationship',
      relationTo: 'coupons',
      admin: {
        description: 'Checked again on every view, so an expired code stops applying on its own.',
      },
    },
    {
      name: 'lastActivityAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'abandonedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set by the hourly job; cleared when the shopper comes back.',
      },
    },
    { name: 'items', type: 'join', collection: 'cart-items', on: 'cart' },
  ],
}
