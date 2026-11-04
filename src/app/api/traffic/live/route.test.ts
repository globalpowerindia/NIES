// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), load: vi.fn() }))
vi.mock('@/lib/storefront/queries', () => ({ getPayloadClient: async () => ({ auth: mocks.auth }) }))
vi.mock('@/lib/traffic', () => ({ loadLiveVisitors: mocks.load }))

import { GET } from './route'

const request = () => new Request('http://localhost:3000/api/traffic/live')

beforeEach(() => {
  vi.resetAllMocks()
  mocks.load.mockResolvedValue({ visitors: 3, pages: [] })
})

describe('the live visitor count', () => {
  it('is refused to the public', async () => {
    mocks.auth.mockResolvedValue({ user: null })
    expect((await GET(request())).status).toBe(401)
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('is refused to staff without the analytics permission', async () => {
    mocks.auth.mockResolvedValue({ user: { collection: 'users', isActive: true, role: { permissions: {} } } })
    expect((await GET(request())).status).toBe(401)
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('is uncached for staff who may see it', async () => {
    mocks.auth.mockResolvedValue({ user: { collection: 'users', isActive: true, isSuperAdmin: true } })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toEqual({ visitors: 3, pages: [] })
  })
})
