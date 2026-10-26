import type { CollectionConfig } from 'payload'

import { allow } from '@/access/roles'
import { INDIAN_STATES } from '@/lib/indian-states'

export const ADDRESS_TYPES = ['HOME', 'OFFICE', 'OTHER'] as const

export type AddressType = (typeof ADDRESS_TYPES)[number]

/**
 * A customer's saved delivery addresses, managed from My Address. Orders copy
 * the address into their own fields at checkout, so editing or removing one
 * here never rewrites an order that used it.
 */
export const Addresses: CollectionConfig = {
  slug: 'addresses',
  labels: { singular: 'Address', plural: 'Addresses' },
  admin: {
    useAsTitle: 'fullName',
    group: 'Customers',
    defaultColumns: ['fullName', 'customer', 'city', 'stateCode', 'type'],
  },
  access: {
    read: allow('addresses', 'read'),
    create: allow('addresses', 'create'),
    update: allow('addresses', 'update'),
    delete: allow('addresses', 'delete'),
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        { name: 'fullName', type: 'text', required: true, admin: { width: '50%' } },
        {
          name: 'phone',
          type: 'text',
          required: true,
          admin: { width: '50%', description: 'E.164, e.g. +919876543210' },
        },
      ],
    },
    { name: 'line1', label: 'Flat, House No., Building, Apartment', type: 'text', required: true },
    { name: 'line2', label: 'Area, Street, Sector', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'city', type: 'text', required: true, admin: { width: '40%' } },
        {
          name: 'pincode',
          label: 'PIN code',
          type: 'text',
          required: true,
          admin: { width: '20%' },
        },
        {
          name: 'stateCode',
          label: 'State',
          type: 'select',
          required: true,
          options: INDIAN_STATES.map((state) => ({ label: state.name, value: state.code })),
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'HOME',
      options: [
        { label: 'Home', value: 'HOME' },
        { label: 'Office', value: 'OFFICE' },
        { label: 'Other', value: 'OTHER' },
      ],
    },
  ],
}
