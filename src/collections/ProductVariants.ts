import type { CollectionConfig } from 'payload'

import { anyone, isManager, isSuperAdmin } from '@/access/roles'
import { paiseField } from '@/fields/paise'
import { ensureInventory } from '@/lib/inventory'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'
import { refreshOnVariantChange } from '@/lib/search-refresh'

export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  labels: { singular: 'Variant', plural: 'Variants' },
  admin: {
    useAsTitle: 'sku',
    group: 'Catalog',
    defaultColumns: ['sku', 'product', 'name', 'sellingPricePaise', 'isActive'],
    components: { views: { list: { Component: '/admin/views/VariantsList#VariantsList' } } },
  },
  access: {
    read: anyone,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const { mrpPaise, sellingPricePaise } = data
        if (
          typeof mrpPaise === 'number' &&
          typeof sellingPricePaise === 'number' &&
          sellingPricePaise > mrpPaise
        ) {
          throw new Error('Selling price cannot exceed MRP.')
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        // Every variant gets a stock row straight away, so it shows up in
        // Stock levels (as out of stock) before anyone receives goods.
        if (operation === 'create') await ensureInventory(req, doc.id)
        return doc
      },
      revalidateStorefront,
      refreshOnVariantChange,
    ],
    afterDelete: [revalidateStorefrontOnDelete],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
    },
    {
      name: 'sku',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Stock keeping unit. Must be unique across the catalog.' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'How this variant is labelled, e.g. "Cordless · 4Ah · Kit".' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'powerSource',
          type: 'select',
          options: [
            { label: 'Corded', value: 'CORDED' },
            { label: 'Cordless', value: 'CORDLESS' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'batteryAh',
          type: 'number',
          admin: {
            width: '33%',
            step: 1,
            description: 'Scaled x10, so 4.0Ah is 40.',
            condition: (_, siblingData) => siblingData?.powerSource === 'CORDLESS',
          },
        },
        {
          name: 'packType',
          type: 'select',
          options: [
            { label: 'Bare tool', value: 'BARE_TOOL' },
            { label: 'Kit', value: 'KIT' },
          ],
          admin: { width: '33%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        paiseField({ name: 'mrpPaise', label: 'MRP', required: true, admin: { width: '50%' } }),
        paiseField({
          name: 'sellingPricePaise',
          label: 'Selling price',
          required: true,
          admin: { width: '50%' },
        }),
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'weightGrams', type: 'number', min: 0, admin: { width: '50%', step: 1 } },
        { name: 'barcode', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { description: 'Optional. Falls back to the product images when empty.' },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Preselected on the product page.' },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
