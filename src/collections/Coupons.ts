import type { CollectionConfig, NumberFieldSingleValidation } from 'payload'

import { isManager, isStaff, isSuperAdmin } from '@/access/roles'
import { paiseField } from '@/fields/paise'
import { normaliseCouponCode } from '@/lib/cart-rules'

/**
 * Discount codes. The cart checks every rule here on each view (see
 * `evaluateCoupon`); usage is counted from Coupon redemptions, which checkout
 * writes when an order is paid.
 */
export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: { singular: 'Coupon', plural: 'Coupons' },
  admin: {
    useAsTitle: 'code',
    group: 'Commerce',
    defaultColumns: ['code', 'type', 'percentBps', 'amountPaise', 'endsAt', 'isActive'],
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
            step: 1,
            description: 'Paise. ₹500 is 50000.',
            condition: (_, siblingData) => siblingData?.type === 'FLAT',
          },
          validate: ((value, { siblingData }) => {
            if ((siblingData as { type?: string })?.type !== 'FLAT') return true
            return Number.isSafeInteger(value) && value! > 0
              ? true
              : 'Enter the amount off in paise (₹500 is 50000).'
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
          admin: { width: '50%', description: 'Paise. Leave empty for no minimum.' },
        }),
        paiseField({
          name: 'maxDiscountPaise',
          label: 'Largest discount',
          admin: {
            width: '50%',
            description: 'Paise. Caps a percentage code, e.g. 10% up to ₹1,000 (100000).',
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
    { name: 'redemptions', type: 'join', collection: 'coupon-redemptions', on: 'coupon' },
  ],
}
