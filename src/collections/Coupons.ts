import type { CollectionConfig, NumberFieldSingleValidation, Validate } from 'payload'

import { isManager, isStaff, isSuperAdmin } from '@/access/roles'
import { paiseField } from '@/fields/paise'
import { normaliseCouponCode } from '@/lib/cart-rules'

/**
 * Discount codes. The cart checks every rule here on each view (see
 * `evaluateCoupon`); usage is counted from Coupon redemptions, which checkout
 * writes when an order is paid, plus open checkouts still holding the code.
 */

/** A code limited to some items must name at least one product, category or brand. */
const validateScope: Validate = (_value, { siblingData }) => {
  const data = siblingData as { appliesTo?: string; products?: unknown[]; categories?: unknown[]; brands?: unknown[] }
  if (data.appliesTo !== 'ITEMS') return true
  return (data.products?.length ?? 0) + (data.categories?.length ?? 0) + (data.brands?.length ?? 0) > 0
    ? true
    : 'Choose at least one product, category or brand, or apply the code to the whole order.'
}
export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: { singular: 'Coupon', plural: 'Coupons' },
  admin: {
    useAsTitle: 'code',
    group: 'Commerce',
    defaultColumns: ['code', 'type', 'percentBps', 'amountPaise', 'endsAt', 'isActive'],
    components: { views: { list: { Component: '/admin/views/CouponsList#CouponsList' } } },
    description:
      'Discount codes shoppers enter in the cart. Switch a code off rather than deleting it.',
  },
  access: {
    read: isStaff,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'code',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: {
            width: '50%',
            description: 'Saved in capitals without spaces. Shoppers can type it either way.',
          },
          hooks: {
            beforeValidate: [
              ({ value }) => (typeof value === 'string' ? normaliseCouponCode(value) : value),
            ],
          },
        },
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: true,
          admin: { width: '50%', style: { alignSelf: 'flex-end' } },
        },
      ],
    },
    {
      name: 'description',
      type: 'text',
      admin: { description: 'For staff only, e.g. "Diwali 2026 newsletter".' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'PERCENT',
          options: [
            { label: 'Percentage off', value: 'PERCENT' },
            { label: 'Fixed amount off', value: 'FLAT' },
            { label: 'Free delivery', value: 'FREE_SHIPPING' },
          ],
          admin: { width: '34%' },
        },
        {
          name: 'percentBps',
          label: 'Percentage (basis points)',
          type: 'number',
          admin: {
            width: '33%',
            step: 1,
            description: '1000 = 10%.',
            condition: (_, siblingData) => siblingData?.type === 'PERCENT',
          },
          validate: ((value, { siblingData }) => {
            if ((siblingData as { type?: string })?.type !== 'PERCENT') return true
            return Number.isInteger(value) && value! > 0 && value! <= 10_000
              ? true
              : 'Enter a whole number from 1 to 10000 (10000 = 100%).'
          }) satisfies NumberFieldSingleValidation,
        },
        {
          name: 'amountPaise',
          label: 'Amount off',
          type: 'number',
          min: 0,
          admin: {
            width: '33%',
            description: 'In rupees.',
            condition: (_, siblingData) => siblingData?.type === 'FLAT',
            components: { Field: '/admin/components/RupeeField#RupeeField' },
          },
          validate: ((value, { siblingData }) => {
            if ((siblingData as { type?: string })?.type !== 'FLAT') return true
            return Number.isSafeInteger(value) && value! > 0
              ? true
              : 'Enter the amount off, e.g. 500.'
          }) satisfies NumberFieldSingleValidation,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        paiseField({
          name: 'minSubtotalPaise',
          label: 'Minimum order',
          admin: { width: '50%', description: 'Leave empty for no minimum.' },
        }),
        paiseField({
          name: 'maxDiscountPaise',
          label: 'Largest discount',
          admin: {
            width: '50%',
            description: 'Caps a percentage code, e.g. 10% up to ₹1,000.',
            condition: (_, siblingData) => siblingData?.type !== 'FREE_SHIPPING',
          },
        }),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          type: 'date',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Empty: valid now.',
          },
        },
        {
          name: 'endsAt',
          type: 'date',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Empty: never expires.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'usageLimit',
          label: 'Total uses',
          type: 'number',
          min: 1,
          admin: { width: '50%', step: 1, description: 'Across all shoppers. Empty: unlimited.' },
        },
        {
          name: 'perCustomerLimit',
          label: 'Uses per customer',
          type: 'number',
          min: 1,
          admin: {
            width: '50%',
            step: 1,
            description: 'Empty: unlimited. When set, shoppers must sign in to use the code.',
          },
        },
      ],
    },
    {
      name: 'appliesTo',
      label: 'Applies to',
      type: 'select',
      defaultValue: 'CART',
      options: [
        { label: 'The whole order', value: 'CART' },
        { label: 'Selected products, categories or brands', value: 'ITEMS' },
      ],
      admin: {
        condition: (_, siblingData) => siblingData?.type !== 'FREE_SHIPPING',
        description:
          'For selected items, the discount is worked out on those items only. The minimum order still counts the whole cart.',
      },
    },
    {
      type: 'row',
      admin: { condition: (_, siblingData) => siblingData?.appliesTo === 'ITEMS' && siblingData?.type !== 'FREE_SHIPPING' },
      fields: [
        { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, admin: { width: '34%' }, validate: validateScope },
        {
          name: 'categories',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          admin: { width: '33%', description: 'Includes their sub-categories.' },
        },
        { name: 'brands', type: 'relationship', relationTo: 'brands', hasMany: true, admin: { width: '33%' } },
      ],
    },
    {
      name: 'firstOrderOnly',
      label: 'First order only',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Only for signed-in customers who have never had a paid order.' },
    },
    { name: 'redemptions', type: 'join', collection: 'coupon-redemptions', on: 'coupon' },
  ],
}
