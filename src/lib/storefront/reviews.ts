import type { Payload, PayloadRequest } from 'payload'

import { inTransaction } from '@/lib/transaction'
import type { ReviewInput } from '@/lib/validations/reviews'
import type { Customer, Review } from '@/payload-types'

/** Only these fields are returned to the review's owner. */
export const ownReview = (review: Review) => ({
  rating: review.rating,
  title: review.title ?? '',
  body: review.body ?? '',
  status: review.status,
  verifiedPurchase: Boolean(review.verifiedPurchase),
})

export class ReviewEligibilityError extends Error {
  constructor() {
    super('You can review this product after your paid order has been delivered.')
  }
}

export const canReviewProduct = async (payload: Payload, customerId: number, productId: number, req?: PayloadRequest) => {
  const orders = await payload.count({
    collection: 'orders',
    where: { and: [
      { customer: { equals: customerId } },
      { status: { equals: 'DELIVERED' } },
      { paidAt: { exists: true } },
      { 'items.product': { equals: productId } },
    ] },
    overrideAccess: true, req,
  })
  return orders.totalDocs > 0
}

export const submitReview = async (payload: Payload, customer: Customer, input: ReviewInput) =>
  inTransaction(payload, [`reviews:customer:${customer.id}:product:${input.productId}`], async (req) => {
    const product = await payload.count({
      collection: 'products',
      where: { and: [{ id: { equals: input.productId } }, { status: { equals: 'ACTIVE' } }] },
      overrideAccess: true,
      req,
    })
    if (!product.totalDocs) return null

    if (!await canReviewProduct(payload, customer.id, input.productId, req)) throw new ReviewEligibilityError()

    const { docs } = await payload.find({
      collection: 'reviews',
      where: { and: [{ customer: { equals: customer.id } }, { product: { equals: input.productId } }] },
      limit: 1, depth: 0, overrideAccess: true, req,
    })
    const existing = docs[0]
    // A retried request must not remove an already-approved review.
    if (existing && existing.rating === input.rating && existing.title === input.title && existing.body === input.body && existing.status !== 'REJECTED') {
      return ownReview(existing)
    }

    const data = {
      product: input.productId,
      customer: customer.id,
      authorName: [customer.firstName?.trim(), customer.lastName?.trim().charAt(0)].filter(Boolean).join(' ') || 'Customer',
      rating: input.rating,
      title: input.title,
      body: input.body,
      verifiedPurchase: true,
      status: 'PENDING' as const,
    }
    const review = existing
      ? await payload.update({ collection: 'reviews', id: existing.id, data, overrideAccess: true, req })
      : await payload.create({ collection: 'reviews', data, overrideAccess: true, req })
    return ownReview(review)
  })
