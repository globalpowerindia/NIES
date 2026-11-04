import type { Payload, PayloadRequest } from 'payload'

import { relId } from '@/lib/relations'
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
  photos: (review.photos ?? []).flatMap((photo) => (typeof photo === 'object' && photo.url ? [{ id: photo.id, url: photo.url }] : [])),
})

export class ReviewEligibilityError extends Error {
  constructor() {
    super('You can review this product after your paid order has been delivered.')
  }
}

export class ReviewPhotoError extends Error {
  constructor() {
    super('One of those photos could not be attached. Please add it again.')
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

const samePhotos = (review: Review, photoIds: number[]) =>
  JSON.stringify((review.photos ?? []).map(relId)) === JSON.stringify(photoIds)

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

    // Ids come from the browser, so each must be a photo this customer uploaded.
    const photoIds = [...new Set(input.photoIds ?? [])]
    if (photoIds.length > 0) {
      const owned = await payload.count({
        collection: 'review-photos',
        where: { and: [{ id: { in: photoIds } }, { customer: { equals: customer.id } }] },
        overrideAccess: true,
        req,
      })
      if (owned.totalDocs !== photoIds.length) throw new ReviewPhotoError()
    }

    const { docs } = await payload.find({
      collection: 'reviews',
      where: { and: [{ customer: { equals: customer.id } }, { product: { equals: input.productId } }] },
      limit: 1, depth: 1, overrideAccess: true, req,
    })
    const existing = docs[0]
    // A retried request must not remove an already-approved review.
    if (existing && existing.rating === input.rating && existing.title === input.title && existing.body === input.body && samePhotos(existing, photoIds) && existing.status !== 'REJECTED') {
      return ownReview(existing)
    }

    const data = {
      product: input.productId,
      customer: customer.id,
      authorName: [customer.firstName?.trim(), customer.lastName?.trim().charAt(0)].filter(Boolean).join(' ') || 'Customer',
      rating: input.rating,
      title: input.title,
      body: input.body,
      photos: photoIds,
      verifiedPurchase: true,
      status: 'PENDING' as const,
    }
    const review = existing
      ? await payload.update({ collection: 'reviews', id: existing.id, data, overrideAccess: true, req })
      : await payload.create({ collection: 'reviews', data, overrideAccess: true, req })
    return ownReview(review)
  })
