import type { Access, CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, PayloadRequest } from 'payload'

import { activeStaffRole, isManager, isStaff } from '@/access/roles'
import { sql } from 'drizzle-orm'
import { transactionDB } from '@/lib/transaction'

const relId = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null | undefined)?.id

/** Recomputes the rating shown on cards and the product page from approved reviews only. */
const refreshProductRating = async (req: PayloadRequest, productId: number | undefined) => {
  if (!productId) return
  // Serialize aggregate updates, including moderation and deletion, so two
  // simultaneous reviews cannot leave a stale product rating behind.
  if (await req.transactionID) {
    const db = await transactionDB(req)
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`reviews:product:${productId}`}, 0))`)
  }
  const approved = await req.payload.find({
    collection: 'reviews',
    where: { and: [{ product: { equals: productId } }, { status: { equals: 'APPROVED' } }] },
    pagination: false,
    depth: 0,
    select: { rating: true },
    req,
  })
  const count = approved.docs.length
  const total = approved.docs.reduce((sum, review) => sum + Number(review.rating ?? 0), 0)
  await req.payload.update({
    collection: 'products',
    id: productId,
    data: { ratingAvg: count ? Math.round((total / count) * 100) : 0, ratingCount: count },
    depth: 0,
    req,
  })
}

const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  await refreshProductRating(req, relId(doc.product))
  const previousProduct = relId(previousDoc?.product)
  if (previousProduct && previousProduct !== relId(doc.product)) await refreshProductRating(req, previousProduct)
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await refreshProductRating(req, relId(doc.product))
  return doc
}

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'title',
    group: 'Catalog',
    defaultColumns: ['title', 'product', 'authorName', 'rating', 'verifiedPurchase', 'status', 'createdAt'],
    description: 'Only approved reviews appear on the storefront and count towards the rating.',
  },
  access: {
    // The public sees approved reviews only; staff see the moderation queue.
    read: ({ req }): ReturnType<Access> => (activeStaffRole(req.user) ? true : { and: [{ status: { equals: 'APPROVED' } }, { 'product.status': { equals: 'ACTIVE' } }] }),
    create: isStaff,
    update: isStaff,
    delete: isManager,
  },
  hooks: { afterChange: [afterChange], afterDelete: [afterDelete] },
  indexes: [{ fields: ['customer', 'product'], unique: true }],
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      index: true,
      // Legacy/staff reviews may have no account. Never expose an account ID
      // or populated customer details through the public Reviews API.
      access: { read: ({ req }) => Boolean(activeStaffRole(req.user)) },
      admin: { readOnly: true, description: 'Set automatically for customer submissions.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'authorName', type: 'text', required: true, admin: { width: '50%' } },
        {
          name: 'rating',
          type: 'number',
          required: true,
          min: 1,
          max: 5,
          validate: (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) || 'Choose a whole-star rating from 1 to 5.',
          admin: { width: '25%', step: 1 },
        },
        {
          name: 'verifiedPurchase',
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '25%', readOnly: true, description: 'Verified against a delivered, paid order when submitted.' },
        },
      ],
    },
    { name: 'title', type: 'text', maxLength: 120 },
    { name: 'body', type: 'textarea', maxLength: 2500 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PENDING',
      index: true,
      options: [
        { label: 'Waiting for review', value: 'PENDING' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
