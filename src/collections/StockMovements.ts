import { APIError, type CollectionConfig } from 'payload'

import { isStaff } from '@/access/roles'
import { applyStockChange, ensureInventory, MOVEMENT_TYPES, type MovementType } from '@/lib/inventory'
import { revalidateStorefront } from '@/lib/revalidate'

const relId = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null | undefined)?.id

/**
 * Append-only stock ledger. Rows can't be edited or deleted; a mistake is
 * corrected by recording the opposite movement, the same as a paper stock book.
 */
export const StockMovements: CollectionConfig = {
  slug: 'stock-movements',
  labels: { singular: 'Stock movement', plural: 'Stock movements' },
  admin: {
    group: 'Inventory',
    defaultColumns: ['createdAt', 'variant', 'type', 'quantity', 'onHandAfter'],
    components: { views: { list: { Component: '/admin/views/StockMovementsList#StockMovementsList' } } },
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        const type = data.type as MovementType
        const rule = MOVEMENT_TYPES[type]
        if (!rule) throw new APIError('Unknown movement type.', 400, undefined, true)
        if (rule.system && req.user) {
          throw new APIError('That movement is recorded automatically by orders.', 400, undefined, true)
        }

        const quantity = Number(data.quantity)
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
          throw new APIError('Quantity must be a whole number above zero.', 400, undefined, true)
        }

        const variantId = relId(data.variant)
        if (!variantId) throw new APIError('Choose a variant.', 400, undefined, true)

        const inventory = await ensureInventory(req, variantId)
        const balance = await applyStockChange(
          req,
          inventory.id,
          rule.onHand * quantity,
          rule.reserved * quantity,
        )

        data.inventory = inventory.id
        data.onHandAfter = balance.onHand
        data.reservedAfter = balance.reserved
        if (req.user) data.recordedBy = req.user.id
        return data
      },
    ],
    afterChange: [revalidateStorefront],
  },
  fields: [
    {
      name: 'variant',
      type: 'relationship',
      relationTo: 'product-variants',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'RECEIVED',
          index: true,
          options: Object.entries(MOVEMENT_TYPES).map(([value, rule]) => ({ label: rule.label, value })),
          admin: { width: '60%' },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          admin: { width: '40%', step: 1, description: 'Always positive. The type decides add or remove.' },
        },
      ],
    },
    { name: 'note', type: 'textarea', admin: { placeholder: 'Supplier invoice no., reason for correction…' } },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      admin: { condition: (data) => Boolean(data?.order) },
    },
    {
      name: 'inventory',
      type: 'relationship',
      relationTo: 'inventory',
      index: true,
      admin: { hidden: true },
    },
    {
      type: 'row',
      fields: [
        { name: 'onHandAfter', type: 'number', label: 'On hand after', admin: { width: '50%', readOnly: true } },
        { name: 'reservedAfter', type: 'number', label: 'Reserved after', admin: { width: '50%', readOnly: true } },
      ],
    },
    {
      name: 'recordedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
