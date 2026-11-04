// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ customer: vi.fn(), rate: vi.fn(), eligible: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/storefront/customer', () => ({ getCurrentCustomer: mocks.customer }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rate }))
vi.mock('@/lib/storefront/queries', () => ({ getPayloadClient: async () => ({ logger: { error: vi.fn() } }) }))
vi.mock('@/lib/storefront/reviews', () => ({ canReviewProduct: mocks.eligible }))
vi.mock('@/lib/review-photos', async () => {
  class ReviewPhotoFormatError extends Error {
    constructor() {
      super('Not a photo')
    }
  }
  return { ReviewPhotoFormatError, saveReviewPhoto: mocks.save }
})

import { ReviewPhotoFormatError } from '@/lib/review-photos'

import { POST } from './route'

const URL = 'http://localhost:3000/api/product-reviews/photos'

const request = (origin = 'http://localhost:3000', bytes = 10) => {
  const form = new FormData()
  form.set('productId', '12')
  form.set('photo', new File([new Uint8Array(bytes)], 'photo.jpg', { type: 'image/jpeg' }))
  return new Request(URL, { method: 'POST', headers: { origin, 'content-length': String(bytes + 300) }, body: form })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
  mocks.customer.mockResolvedValue({ id: 7 })
  mocks.rate.mockResolvedValue({ ok: true })
  mocks.eligible.mockResolvedValue(true)
  mocks.save.mockResolvedValue({ id: 3, url: 'https://files.test/a.webp' })
})

describe('review photo uploads', () => {
  it('rejects other sites', async () => {
    expect((await POST(request('https://other.example'))).status).toBe(403)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('requires a signed-in customer', async () => {
    mocks.customer.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('only accepts photos from someone who received the product', async () => {
    mocks.eligible.mockResolvedValue(false)
    expect((await POST(request())).status).toBe(403)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('refuses an oversized body before reading it', async () => {
    const response = await POST(new Request(URL, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-length': String(5 * 1024 * 1024) },
      body: 'x',
    }))
    expect(response.status).toBe(413)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('enforces the per-customer limit', async () => {
    mocks.rate.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false })
    expect((await POST(request())).status).toBe(429)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('explains a file that is not a photo', async () => {
    mocks.save.mockRejectedValue(new ReviewPhotoFormatError())
    const response = await POST(request())
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ error: 'Not a photo' })
  })

  it('saves the photo against the session customer', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.save.mock.calls[0][1]).toBe(7)
    expect(await response.json()).toMatchObject({ photo: { id: 3 } })
  })
})
