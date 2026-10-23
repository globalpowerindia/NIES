import type { GlobalConfig } from 'payload'

import { can } from '@/access/permissions'
import { allow, anyone } from '@/access/roles'
import { paiseField } from '@/fields/paise'

/**
 * Delivery charges by parcel weight. Read by checkout on every quote, so a
 * change here applies to the next order (orders already placed keep the fee
 * they were charged).
 */
export const CheckoutSettings: GlobalConfig = {
  slug: 'checkout-settings',
  label: 'Delivery & Checkout',
  admin: {
    // Read publicly by the storefront; in the admin, only for roles that may change it.
    hidden: ({ user }) => !can(user, 'checkout-settings', 'update'),
    group: 'Commerce',
    description: 'Delivery is charged by the total weight of the order, using these slabs.',
  },
  access: {
    read: anyone,
    update: allow('checkout-settings', 'update'),
  },
  fields: [
    {
      name: 'shippingSlabs',
      label: 'Delivery slabs',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Slab', plural: 'Slabs' },
      admin: {
        description:
          'Each slab covers orders up to its weight. Prices include GST. Kerala orders use the first price, all other states the second.',
      },
      defaultValue: [
        { maxWeightKg: 2, withinStatePaise: 9_900, otherStatesPaise: 19_900 },
        { maxWeightKg: 5, withinStatePaise: 14_900, otherStatesPaise: 29_900 },
        { maxWeightKg: 10, withinStatePaise: 24_900, otherStatesPaise: 44_900 },
        { maxWeightKg: 20, withinStatePaise: 44_900, otherStatesPaise: 79_900 },
      ],
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'maxWeightKg',
              label: 'Up to (kg)',
              type: 'number',
              required: true,
              min: 0.001,
              admin: { width: '30%', step: 0.1 },
            },
            paiseField({ name: 'withinStatePaise', label: 'Within Kerala', required: true, admin: { width: '35%' } }),
            paiseField({ name: 'otherStatesPaise', label: 'Other states', required: true, admin: { width: '35%' } }),
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        paiseField({
          name: 'extraPerKgWithinStatePaise',
          label: 'Each kg above the last slab — Kerala',
          required: true,
          defaultValue: 2_500,
          admin: { width: '50%' },
        }),
        paiseField({
          name: 'extraPerKgOtherStatesPaise',
          label: 'Each kg above the last slab — other states',
          required: true,
          defaultValue: 4_500,
          admin: { width: '50%' },
        }),
      ],
    },
    {
      name: 'defaultWeightKg',
      label: 'Weight to assume when a product has none (kg)',
      type: 'number',
      required: true,
      min: 0.001,
      defaultValue: 5,
      admin: {
        step: 0.1,
        description: 'Enter each variant’s weight (Products → variant → Weight) so customers are charged correctly.',
      },
    },
  ],
}
