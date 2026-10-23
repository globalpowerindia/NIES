import type { CollectionConfig } from 'payload'

import { allow, pricesField, publishedVariants } from '@/access/roles'
import { paiseField } from '@/fields/paise'
import { ensureInventory } from '@/lib/inventory'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'
import { refreshOnVariantChange } from '@/lib/search-refresh'

const PRICE_ACCESS = { create: pricesField, update: pricesField }

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
    read: publishedVariants,
    create: allow('product-variants', 'create'),
    update: allow('product-variants', 'update'),
    delete: allow('product-variants', 'delete'),
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        const mrpPaise = data.mrpPaise ?? originalDoc?.mrpPaise
        const sellingPricePaise = data.sellingPricePaise ?? originalDoc?.sellingPricePaise
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
    beforeChange: [
      ({ data, operation, req }) => {
        // `openingStock` is virtual; carry it to afterChange, where the variant has an id.
        if (operation === 'create') req.context.openingStock = data.openingStock
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        // Every variant gets a stock row straight away, so it shows up in
        // Stock levels (as out of stock) before anyone receives goods.
        await ensureInventory(req, doc.id)
        // Opening stock is recorded like any delivery, so the ledger accounts for every unit.
        const opening = Number(req.context.openingStock ?? 0)
        if (Number.isSafeInteger(opening) && opening > 0) {
          await req.payload.create({
            collection: 'stock-movements',
            data: { variant: doc.id, type: 'RECEIVED', quantity: opening, note: 'Opening stock' },
            req,
          })
        }
        return doc
      },
      // One default per product: choosing one clears it on the others.
      async ({ doc, req, context }) => {
        if (!doc.isDefault || context.clearingDefault) return doc
        const productId = typeof doc.product === 'object' ? doc.product?.id : doc.product
        await req.payload.update({
          collection: 'product-variants',
          where: {
            and: [{ product: { equals: productId } }, { id: { not_equals: doc.id } }, { isDefault: { equals: true } }],
          },
          data: { isDefault: false },
          req,
          context: { clearingDefault: true },
        })
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
        // Prices need the role's price permission as well as edit rights here.
        paiseField({ name: 'mrpPaise', label: 'MRP', required: true, admin: { width: '50%' }, access: PRICE_ACCESS }),
        paiseField({
          name: 'sellingPricePaise',
          label: 'Selling price',
          required: true,
          admin: { width: '50%' },
          access: PRICE_ACCESS,
        }),
      ],
    },
    {
      name: 'openingStock',
      type: 'number',
      virtual: true,
      min: 0,
      admin: {
        step: 1,
        description:
          'Units in the warehouse now. Recorded as "Stock received"; later changes go through Stock levels or the product’s Price & stock tab.',
        condition: (data) => !data?.id,
      },
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
