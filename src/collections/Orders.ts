import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

import { bulkOrderStatus } from '@/admin/endpoints/bulkOrderStatus'
import { isManager, isStaff, isSuperAdmin } from '@/access/roles'
import { paiseField } from '@/fields/paise'
import { LOCKED_ORDER_FIELDS, staffCanMoveOrder } from '@/lib/order-rules'
import { releaseOrderStock } from '@/lib/order-stock'

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
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
  { label: 'Out for delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Returned', value: 'RETURNED' },
]

/**
 * Why an order was cancelled. It decides what a payment that arrives
 * afterwards may do: only an order that simply ran out of time can be revived
 * by it (see `confirmPayment`); any other cancelled order is refunded instead.
 */
export const CANCEL_REASON_OPTIONS = [
  { label: 'Payment window expired', value: 'EXPIRED' },
  { label: 'Replaced by a newer checkout', value: 'SUPERSEDED' },
  { label: 'Cancelled by staff', value: 'STAFF' },
  { label: 'Payment provider unavailable', value: 'GATEWAY_ERROR' },
]

/**
 * The same rules for every staff write — admin form, REST, GraphQL or the bulk
 * endpoint. System code (checkout, payment capture, seeds) runs without a
 * staff user and is not limited by them.
 */
const enforceOrderRules: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !originalDoc || !req.user) return data
  for (const field of LOCKED_ORDER_FIELDS) if (field in data) data[field] = originalDoc[field]
  const from = originalDoc.status as OrderStatus
  const to = (data.status ?? from) as OrderStatus
  if (!staffCanMoveOrder(from, to)) {
    const label = (status: OrderStatus) => ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
    throw new APIError(`An order can't go from "${label(from)}" to "${label(to)}".`, 400)
  }
  if (to === 'CANCELLED' && from !== 'CANCELLED') data.cancelReason = 'STAFF'
  return data
}

/** An unpaid order that is cancelled (by expiry, a retried checkout, or staff) gives its held stock back. */
const releaseUnpaidStock: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation === 'update' && previousDoc?.status === 'PENDING_PAYMENT' && doc.status === 'CANCELLED') {
    await releaseOrderStock(req, doc.id)
  }
  return doc
}

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
  hooks: { beforeChange: [enforceOrderRules], afterChange: [releaseUnpaidStock] },
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
      name: 'cancelReason',
      type: 'select',
      options: CANCEL_REASON_OPTIONS,
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => data?.status === 'CANCELLED',
        description: 'Set automatically. Only an expired order can be revived by a late payment.',
      },
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
            {
              name: 'customer',
              type: 'relationship',
              relationTo: 'customers',
              index: true,
              admin: {
                description: 'The signed-in customer who placed it; empty for guest orders.',
              },
            },
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
              admin: {
                description: 'Snapshot taken at order time — survives later product edits.',
              },
              fields: [
                {
                  // Only for the picture and link on My Orders; name, price and
                  // tax below are the snapshot and never read through this.
                  name: 'product',
                  type: 'relationship',
                  relationTo: 'products',
                },
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
                    paiseField({
                      name: 'lineNetPaise',
                      label: 'Line net',
                      required: true,
                      admin: { width: '33%' },
                    }),
                    paiseField({
                      name: 'lineTaxablePaise',
                      label: 'Taxable',
                      required: true,
                      admin: { width: '33%' },
                    }),
                    paiseField({
                      name: 'lineTaxPaise',
                      label: 'Tax',
                      required: true,
                      admin: { width: '34%' },
                    }),
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
                paiseField({
                  name: 'subtotalPaise',
                  label: 'Subtotal',
                  required: true,
                  admin: { width: '33%' },
                }),
                paiseField({
                  name: 'discountPaise',
                  label: 'Discount',
                  defaultValue: 0,
                  admin: { width: '33%' },
                }),
                paiseField({
                  name: 'shippingPaise',
                  label: 'Shipping',
                  defaultValue: 0,
                  admin: { width: '34%' },
                }),
              ],
            },
            {
              type: 'row',
              fields: [
                paiseField({
                  name: 'taxablePaise',
                  label: 'Taxable value',
                  required: true,
                  admin: { width: '25%' },
                }),
                paiseField({
                  name: 'cgstPaise',
                  label: 'CGST',
                  defaultValue: 0,
                  admin: { width: '25%' },
                }),
                paiseField({
                  name: 'sgstPaise',
                  label: 'SGST',
                  defaultValue: 0,
                  admin: { width: '25%' },
                }),
                paiseField({
                  name: 'igstPaise',
                  label: 'IGST',
                  defaultValue: 0,
                  admin: { width: '25%' },
                }),
              ],
            },
            paiseField({ name: 'grandTotalPaise', label: 'Grand total', required: true }),
          ],
        },
        {
          label: 'Payment',
          description: 'Written by checkout and Razorpay. Read-only: a payment is never edited by hand.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'paymentMethod',
                  type: 'select',
                  defaultValue: 'RAZORPAY',
                  options: [{ label: 'Razorpay (online)', value: 'RAZORPAY' }],
                  admin: { width: '34%', readOnly: true },
                },
                { name: 'razorpayOrderId', type: 'text', unique: true, index: true, admin: { width: '33%', readOnly: true } },
                { name: 'razorpayPaymentId', type: 'text', index: true, admin: { width: '33%', readOnly: true } },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'paymentExpiresAt',
                  type: 'date',
                  admin: {
                    width: '50%',
                    readOnly: true,
                    date: { pickerAppearance: 'dayAndTime' },
                    description: 'Unpaid by then, the order is cancelled and its stock released.',
                  },
                },
                { name: 'paidAt', type: 'date', admin: { width: '50%', readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'coupon', type: 'relationship', relationTo: 'coupons', admin: { width: '50%', readOnly: true } },
                { name: 'couponCode', type: 'text', admin: { width: '50%', readOnly: true } },
              ],
            },
            paiseField({
              name: 'deliveryDiscountPaise',
              label: 'Delivery waived by coupon',
              defaultValue: 0,
              admin: { readOnly: true, description: 'A free-delivery code: what delivery would have cost.' },
            }),
            {
              type: 'row',
              fields: [
                {
                  name: 'shippingWeightGrams',
                  label: 'Parcel weight (g)',
                  type: 'number',
                  admin: { width: '50%', readOnly: true, description: 'What the delivery fee was charged on.' },
                },
                { name: 'cart', type: 'relationship', relationTo: 'carts', admin: { width: '50%', readOnly: true } },
              ],
            },
            {
              name: 'confirmationEmailSentAt',
              type: 'date',
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
            },
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
            {
              name: 'shippedAt',
              type: 'date',
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
            { name: 'notes', type: 'textarea' },
          ],
        },
      ],
    },
  ],
}
