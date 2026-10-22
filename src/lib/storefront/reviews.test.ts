import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Customer, Review } from '@/payload-types'
import { reviewSchema } from '@/lib/validations/reviews'
import { ownReview, ReviewEligibilityError, submitReview } from './reviews'

vi.mock('@/lib/transaction', () => ({
  inTransaction: async (_payload: unknown, _keys: string[], run: (req: object) => unknown) => run({ transactionID: 'test' }),
}))

const input = { productId: 12, rating: 4, title: 'Useful tool', body: 'Works well for home projects.' }
const customer = { id: 7, firstName: 'Alex', lastName: 'Smith', email: 'private@example.test' } as Customer
const count = vi.fn()
const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const payload = { count, find, create, update } as unknown as Payload

beforeEach(() => {
  vi.resetAllMocks()
  count.mockResolvedValue({ totalDocs: 1 })
  find.mockResolvedValue({ docs: [] })
  create.mockImplementation(async ({ data }) => ({ id: 1, ...data }))
  update.mockImplementation(async ({ id, data }) => ({ id, ...data }))
})

describe('review validation and privacy', () => {
  it.each([0, 6, 3.5])('rejects invalid rating %s', (rating) => {
    expect(reviewSchema.safeParse({ ...input, rating }).success).toBe(false)
  })
  it('rejects empty and oversized content', () => {
    for (const change of [{ title: '   ' }, { body: 'short' }, { title: 'x'.repeat(121) }, { body: 'x'.repeat(2501) }]) {
      expect(reviewSchema.safeParse({ ...input, ...change }).success).toBe(false)
    }
  })
  it('strips customer-controlled moderation and identity fields', () => {
    expect(reviewSchema.parse({ ...input, status: 'APPROVED', customer: 99, verifiedPurchase: true })).toEqual(input)
  })
  it('never returns customer relationships or internal IDs to the client', () => {
    const result = ownReview({ id: 8, customer, product: 12, ...input, status: 'PENDING' } as unknown as Review)
    expect(Object.keys(result).sort()).toEqual(['body', 'rating', 'status', 'title', 'verifiedPurchase'])
  })
})

describe('review submission', () => {
  it('creates a pending review under the authenticated customer without exposing their full name', async () => {
    const result = await submitReview(payload, customer, input)
    expect(create.mock.calls[0][0].data).toMatchObject({ customer: 7, product: 12, status: 'PENDING', verifiedPurchase: true, authorName: 'Alex S' })
    expect(result?.status).toBe('PENDING')
  })
  it('requires a paid delivered order for this customer and product to verify a purchase', async () => {
    count.mockReset().mockResolvedValue({ totalDocs: 1 })
    const result = await submitReview(payload, customer, input)
    expect(count.mock.calls[1][0]).toMatchObject({ collection: 'orders', where: { and: [
      { customer: { equals: 7 } }, { status: { equals: 'DELIVERED' } },
      { paidAt: { exists: true } }, { 'items.product': { equals: 12 } },
    ] } })
    expect(result?.verifiedPurchase).toBe(true)
  })
  it('rejects non-purchasers before creating or editing even an existing review', async () => {
    count.mockReset().mockResolvedValueOnce({ totalDocs: 1 }).mockResolvedValue({ totalDocs: 0 })
    find.mockResolvedValue({ docs: [{ id: 9, ...input, status: 'APPROVED' }] })
    await expect(submitReview(payload, customer, input)).rejects.toBeInstanceOf(ReviewEligibilityError)
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
  })
  it('refuses inactive or nonexistent products', async () => {
    count.mockReset().mockResolvedValue({ totalDocs: 0 })
    expect(await submitReview(payload, customer, input)).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })
  it('updates the existing review and returns approved edits to moderation', async () => {
    find.mockResolvedValue({ docs: [{ id: 9, ...input, rating: 2, status: 'APPROVED' }] })
    expect((await submitReview(payload, customer, input))?.status).toBe('PENDING')
    expect(update.mock.calls[0][0]).toMatchObject({ id: 9, data: { status: 'PENDING' } })
    expect(create).not.toHaveBeenCalled()
  })
  it('does not unpublish an unchanged approved review on a retry', async () => {
    find.mockResolvedValue({ docs: [{ id: 9, ...input, status: 'APPROVED' }] })
    expect((await submitReview(payload, customer, input))?.status).toBe('APPROVED')
    expect(update).not.toHaveBeenCalled()
  })
  it('allows a rejected review to be resubmitted for moderation', async () => {
    find.mockResolvedValue({ docs: [{ id: 9, ...input, status: 'REJECTED' }] })
    expect((await submitReview(payload, customer, input))?.status).toBe('PENDING')
  })
})
