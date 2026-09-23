import type { CollectionConfig } from 'payload'

import { bulkOrderStatus } from '@/admin/endpoints/bulkOrderStatus'
import { isManager, isStaff, isSuperAdmin } from '@/access/roles'
import { paiseField } from '@/fields/paise'

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_OPTIONS = [
  { label: 'Awaiting payment', value: 'PENDING_PAYMENT' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Packed', value: 'PACKED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Returned', value: 'RETURNED' },
]

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Commerce',
    defaultColumns: ['orderNumber', 'status', 'customerName', 'grandTotalPaise', 'placedAt'],
    components: {
      views: {
        list: { Component: '/admin/views/OrdersList#OrdersList' },
      },
    },
  },
  access: {
    read: isStaff,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  endpoints: [{ path: '/bulk-status', method: 'post', handler: bulkOrderStatus }],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'orderNumber',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { width: '50%', description: 'PT-<FY>-<sequence>, gapless per financial year.' },
        },
        {
          name: 'invoiceNumber',
          type: 'text',
          unique: true,
          index: true,
          admin: {
            width: '50%',
            description: 'Issued only on payment capture — the GST series must not have gaps.',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PENDING_PAYMENT',
      index: true,
      options: ORDER_STATUS_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'placedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Customer',
          fields: [
            { name: 'customerName', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                { name: 'customerEmail', type: 'email', admin: { width: '50%' } },
                { name: 'customerPhone', type: 'text', admin: { width: '50%' } },
              ],
            },
            {
              name: 'customerGstin',
              type: 'text',
              admin: { description: 'Present for B2B invoices.' },
            },
          ],
        },
        {
          label: 'Shipping',
          description:
            'Frozen at order time. Never a relationship — editing a saved address must not rewrite a historical invoice.',
          fields: [
            { name: 'shipLine1', type: 'text', required: true },
            { name: 'shipLine2', type: 'text' },
            { name: 'shipLandmark', type: 'text' },
            {
              type: 'row',
              fields: [
                { name: 'shipCity', type: 'text', required: true, admin: { width: '40%' } },
                { name: 'shipPincode', type: 'text', required: true, admin: { width: '30%' } },
                {
                  name: 'shipStateCode',
                  type: 'text',
                  required: true,
                  defaultValue: '32',
                  admin: {
                    width: '30%',
                    description: 'GST state code. 32 = Kerala, and decides CGST/SGST vs IGST.',
                  },
                },
              ],
            },
            { name: 'shipStateName', type: 'text', required: true, defaultValue: 'Kerala' },
          ],
        },
        {
          label: 'Items',
          fields: [
            {
              name: 'items',
              type: 'array',
              labels: { singular: 'Item', plural: 'Items' },
              admin: { description: 'Snapshot taken at order time — survives later product edits.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'productName', type: 'text', required: true, admin: { width: '55%' } },
                    { name: 'sku', type: 'text', required: true, admin: { width: '25%' } },
                    {
                      name: 'quantity',
                      type: 'number',
                      required: true,
                      min: 1,
                      admin: { width: '20%', step: 1 },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'hsnCode', type: 'text', required: true, admin: { width: '30%' } },
                    {
                      name: 'gstRateBps',
                      type: 'number',
                      required: true,
                      defaultValue: 1800,
                      admin: { width: '30%', step: 1 },
                    },
                    paiseField({
                      name: 'unitPricePaise',
                      label: 'Unit price',
                      required: true,
                      admin: { width: '40%' },
                    }),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    paiseField({ name: 'lineNetPaise', label: 'Line net', required: true, admin: { width: '33%' } }),
                    paiseField({ name: 'lineTaxablePaise', label: 'Taxable', required: true, admin: { width: '33%' } }),
                    paiseField({ name: 'lineTaxPaise', label: 'Tax', required: true, admin: { width: '34%' } }),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Totals',
          fields: [
            {
              type: 'row',
              fields: [
                paiseField({ name: 'subtotalPaise', label: 'Subtotal', required: true, admin: { width: '33%' } }),
                paiseField({ name: 'discountPaise', label: 'Discount', defaultValue: 0, admin: { width: '33%' } }),
                paiseField({ name: 'shippingPaise', label: 'Shipping', defaultValue: 0, admin: { width: '34%' } }),
              ],
            },
            {
              type: 'row',
              fields: [
                paiseField({ name: 'taxablePaise', label: 'Taxable value', required: true, admin: { width: '25%' } }),
                paiseField({ name: 'cgstPaise', label: 'CGST', defaultValue: 0, admin: { width: '25%' } }),
                paiseField({ name: 'sgstPaise', label: 'SGST', defaultValue: 0, admin: { width: '25%' } }),
                paiseField({ name: 'igstPaise', label: 'IGST', defaultValue: 0, admin: { width: '25%' } }),
              ],
            },
            paiseField({ name: 'grandTotalPaise', label: 'Grand total', required: true }),
          ],
        },
        {
          label: 'Fulfilment',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'trackingCarrier', type: 'text', admin: { width: '50%' } },
                { name: 'trackingNumber', type: 'text', admin: { width: '50%' } },
              ],
            },
            { name: 'shippedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
            { name: 'notes', type: 'textarea' },
          ],
        },
      ],
    },
  ],
}
