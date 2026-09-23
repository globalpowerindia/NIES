import type { CollectionConfig } from 'payload'

import { isManager, isStaff } from '@/access/roles'
import { stockStatusOf } from '@/lib/inventory'
import { revalidateStorefront } from '@/lib/revalidate'

const relId = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null | undefined)?.id

/**
 * One row per variant. Counts are read-only here: they change only through a
 * stock movement, so every unit has a reason and a name against it.
 */
export const Inventory: CollectionConfig = {
  slug: 'inventory',
  labels: { singular: 'Stock level', plural: 'Stock levels' },
  admin: {
    useAsTitle: 'sku',
    group: 'Inventory',
    defaultColumns: ['sku', 'product', 'onHand', 'reserved', 'stockStatus'],
    components: { views: { list: { Component: '/admin/views/InventoryList#InventoryList' } } },
  },
  access: {
    read: isStaff,
    create: isManager,
    update: isManager,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        const variantId = relId(data.variant ?? originalDoc?.variant)
        if (variantId && (!data.sku || !data.product)) {
          const variant = await req.payload.findByID({
            collection: 'product-variants',
            id: variantId,
            depth: 0,
            req,
          })
          data.sku = variant.sku
          data.product = relId(variant.product)
        }
        const onHand = Number(data.onHand ?? originalDoc?.onHand ?? 0)
        const reserved = Number(data.reserved ?? originalDoc?.reserved ?? 0)
        const threshold = Number(data.lowStockThreshold ?? originalDoc?.lowStockThreshold ?? 5)
        data.stockStatus = stockStatusOf(onHand - reserved, threshold)
        return data
      },
    ],
    afterChange: [revalidateStorefront],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'variant',
          type: 'relationship',
          relationTo: 'product-variants',
          required: true,
          unique: true,
          index: true,
          admin: { width: '50%', readOnly: true },
        },
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          index: true,
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    { name: 'sku', type: 'text', index: true, admin: { hidden: true } },
    {
      type: 'row',
      fields: [
        {
          name: 'onHand',
          type: 'number',
          defaultValue: 0,
          label: 'On hand',
          access: { update: () => false },
          admin: { width: '25%', readOnly: true, description: 'Units physically in the warehouse.' },
        },
        {
          name: 'reserved',
          type: 'number',
          defaultValue: 0,
          access: { update: () => false },
          admin: { width: '25%', readOnly: true, description: 'Held for orders awaiting payment.' },
        },
        {
          name: 'available',
          type: 'number',
          virtual: true,
          admin: { width: '25%', readOnly: true, description: 'What customers can buy.' },
          hooks: {
            afterRead: [({ siblingData }) => Number(siblingData.onHand ?? 0) - Number(siblingData.reserved ?? 0)],
          },
        },
        {
          name: 'stockStatus',
          type: 'select',
          index: true,
          defaultValue: 'OUT_OF_STOCK',
          options: [
            { label: 'In stock', value: 'IN_STOCK' },
            { label: 'Low stock', value: 'LOW_STOCK' },
            { label: 'Out of stock', value: 'OUT_OF_STOCK' },
          ],
          admin: { width: '25%', readOnly: true },
        },
      ],
    },
    {
      name: 'adjust',
      type: 'ui',
      admin: { components: { Field: '/admin/components/StockAdjuster#StockAdjuster' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lowStockThreshold',
          type: 'number',
          defaultValue: 5,
          min: 0,
          admin: { width: '50%', step: 1, description: 'Flag as low stock at or below this many available.' },
        },
        {
          name: 'allowBackorder',
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '50%', description: 'Keep selling when out of stock (ships later).' },
        },
      ],
    },
    {
      name: 'movements',
      type: 'join',
      collection: 'stock-movements',
      on: 'inventory',
      defaultSort: '-createdAt',
      defaultLimit: 20,
      admin: { defaultColumns: ['createdAt', 'type', 'quantity', 'onHandAfter', 'note'] },
    },
  ],
}
