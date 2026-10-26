import { afterEach, describe, expect, it, vi } from 'vitest'
const { find } = vi.hoisted(() => ({ find: vi.fn() }))
vi.mock('@/lib/storefront/queries', () => ({ getPayloadClient: async () => ({ find }) }))
import { GET } from '@/app/api/models/[id]/route'

const request = (id: string) =>
  GET(new Request(`http://localhost/api/models/${id}`), { params: Promise.resolve({ id }) })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
describe('model delivery', () => {
  it('rejects malformed IDs without querying or fetching', async () => {
    expect((await request('https://example.com')).status).toBe(404)
    expect(find).not.toHaveBeenCalled()
  })
  it('does not serve missing media or non-model files', async () => {
    find.mockResolvedValue({ docs: [] })
    expect((await request('123')).status).toBe(404)
    expect(find.mock.calls[0][0].where.and[1]).toEqual({
      mimeType: { equals: 'model/gltf-binary' },
    })
  })
  it('streams storage bytes with the model content type', async () => {
    find.mockResolvedValue({ docs: [{ url: 'https://storage.example/drill.glb' }] })
    const fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])))
    vi.stubGlobal('fetch', fetch)
    const result = await request('123')
    expect(result.status).toBe(200)
    expect(result.headers.get('content-type')).toBe('model/gltf-binary')
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })
  it('returns an error when storage is unavailable', async () => {
    find.mockResolvedValue({ docs: [{ url: 'https://storage.example/drill.glb' }] })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect((await request('123')).status).toBe(502)
  })
})
