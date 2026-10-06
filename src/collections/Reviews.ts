import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, PayloadRequest } from 'payload'

import { activeStaffRole, isManager, isStaff } from '@/access/roles'

const relId = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null | undefined)?.id

/** Recomputes the rating shown on cards and the product page from approved reviews only. */
const refreshProductRating = async (req: PayloadRequest, productId: number | undefined) => {
  if (!productId) return
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
    defaultColumns: ['title', 'product', 'rating', 'status', 'createdAt'],
    description: 'Only approved reviews appear on the storefront and count towards the rating.',
  },
  access: {
    // The public sees approved reviews only; staff see the moderation queue.
    read: ({ req }) => (activeStaffRole(req.user) ? true : { status: { equals: 'APPROVED' } }),
    create: isStaff,
    update: isStaff,
    delete: isManager,
  },
  hooks: { afterChange: [afterChange], afterDelete: [afterDelete] },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
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
          admin: { width: '25%', step: 1 },
        },
        {
          name: 'verifiedPurchase',
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '25%' },
        },
      ],
    },
    { name: 'title', type: 'text' },
    { name: 'body', type: 'textarea' },
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
