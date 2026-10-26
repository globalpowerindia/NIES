import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ customer: vi.fn(), rate: vi.fn(), submit: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/storefront/customer', () => ({ getCurrentCustomer: mocks.customer }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rate }))
vi.mock('@/lib/storefront/queries', () => ({ getPayloadClient: async () => ({ find: mocks.find, logger: { error: vi.fn() } }) }))
vi.mock('@/lib/storefront/reviews', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/storefront/reviews')>(), submitReview: mocks.submit, canReviewProduct: async () => false, ownReview: (review: unknown) => review }))

import { GET, POST } from './route'
import { ReviewEligibilityError } from '@/lib/storefront/reviews'

const input = { productId: 12, rating: 5, title: 'Great product', body: 'Works well for home projects.' }
const request = (data: unknown = input, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/product-reviews', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
  mocks.customer.mockResolvedValue({ id: 7 })
  mocks.rate.mockResolvedValue({ ok: true })
  mocks.submit.mockResolvedValue({ ...input, status: 'PENDING' })
  mocks.find.mockResolvedValue({ docs: [] })
})

describe('review API protections', () => {
  it('rejects cross-origin submissions', async () => {
    expect((await POST(request(input, 'https://other.example'))).status).toBe(403)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('requires a customer session', async () => {
    mocks.customer.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('rejects invalid content before writing', async () => {
    expect((await POST(request({ ...input, rating: 6 }))).status).toBe(422)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('passes only validated fields and the session customer to the service', async () => {
    const response = await POST(request({ ...input, customer: 99, status: 'APPROVED', verifiedPurchase: true }))
    expect(response.status).toBe(200)
    expect(mocks.submit.mock.calls[0].slice(1)).toEqual([{ id: 7 }, input])
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('enforces the per-customer limit after the IP limit', async () => {
    mocks.rate.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false })
    expect((await POST(request())).status).toBe(429)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('rejects a submission without a qualifying purchase', async () => {
    mocks.submit.mockRejectedValue(new ReviewEligibilityError())
    expect((await POST(request())).status).toBe(403)
  })
  it('returns not found for inactive products', async () => {
    mocks.submit.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(404)
  })
  it('only reads the authenticated customer’s review even if another ID is supplied', async () => {
    await GET(new Request('http://localhost:3000/api/product-reviews?productId=12&customer=99'))
    expect(mocks.find.mock.calls[0][0].where).toEqual({ and: [{ customer: { equals: 7 } }, { product: { equals: 12 } }] })
  })
})
