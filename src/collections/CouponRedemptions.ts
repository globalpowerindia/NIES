import type { CollectionConfig } from 'payload'

import { isStaff, isSuperAdmin } from '@/access/roles'
import { paiseField } from '@/fields/paise'

/**
 * One use of a coupon, written by checkout when the order is paid. Usage
 * limits count these rows, so a code applied to carts that never paid does
 * not use up anyone's allowance.
 */
export const CouponRedemptions: CollectionConfig = {
  slug: 'coupon-redemptions',
  labels: { singular: 'Coupon redemption', plural: 'Coupon redemptions' },
  admin: {
    group: 'Commerce',
    hidden: true,
    defaultColumns: ['coupon', 'order', 'customer', 'discountPaise', 'createdAt'],
  },
  access: {
    read: isStaff,
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  // One redemption per order, however many times payment confirmation arrives.
  indexes: [{ fields: ['coupon', 'order'], unique: true }],
  fields: [
    { name: 'coupon', type: 'relationship', relationTo: 'coupons', required: true, index: true },
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true },
    paiseField({ name: 'discountPaise', label: 'Discount', required: true }),
  ],
}
