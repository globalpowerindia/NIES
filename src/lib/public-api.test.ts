// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rateLimit: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  LIMITS: { publicRead: { limit: 120, windowSeconds: 60 } },
  rateLimit: mocks.rateLimit,
}))

import { limitPublicReads, PUBLIC_MAX_DEPTH, PUBLIC_MAX_LIMIT } from './public-api'

type HookArgs = Parameters<typeof limitPublicReads>[0]

const requestOf = (api = 'REST', user: unknown = null) => ({
  payloadAPI: api,
  user,
  payload: {},
  context: {},
  headers: new Headers({ 'x-real-ip': '1.2.3.4' }),
})

const run = (
  args: Record<string, unknown>,
  { api, user, operation = 'read', req = requestOf(api, user) }: { api?: string; user?: unknown; operation?: string; req?: ReturnType<typeof requestOf> } = {},
) => limitPublicReads({ args, operation, req } as unknown as HookArgs) as Promise<Record<string, unknown>>

beforeEach(() => {
  mocks.rateLimit.mockReset()
  mocks.rateLimit.mockResolvedValue({ ok: true })
})

describe('anonymous REST reads', () => {
  it('caps the page size', async () => {
    expect((await run({ limit: 100_000 })).limit).toBe(PUBLIC_MAX_LIMIT)
    expect((await run({ limit: 20 })).limit).toBe(20)
  })

  it("doesn't let limit=0 or pagination=false mean everything", async () => {
    expect((await run({ limit: 0 })).limit).toBe(PUBLIC_MAX_LIMIT)
    expect((await run({ pagination: false })).pagination).toBe(true)
  })

  it('caps the depth', async () => {
    expect((await run({ depth: 50 })).depth).toBe(PUBLIC_MAX_DEPTH)
    expect((await run({ depth: 1 })).depth).toBe(1)
  })

  it('leaves the defaults alone when nothing was asked for', async () => {
    expect(await run({})).toEqual({})
  })

  it('counts each caller separately, and refuses past the limit', async () => {
    await run({})
    expect(mocks.rateLimit.mock.calls[0][1]).toBe('rest:ip:1.2.3.4')

    mocks.rateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 })
    await expect(run({})).rejects.toMatchObject({ status: 429 })
  })
})

describe('relationships loaded during a read', () => {
  it('count as one request and keep all their rows', async () => {
    const req = requestOf()
    expect((await run({ limit: 100_000 }, { req })).limit).toBe(PUBLIC_MAX_LIMIT)

    // Payload's relationship loader, on the same request.
    expect((await run({ limit: 500, pagination: false }, { req })).limit).toBe(500)
    expect(mocks.rateLimit).toHaveBeenCalledTimes(1)
  })
})

describe('reads left alone', () => {
  const args = { limit: 100_000, depth: 50, pagination: false }

  it('from active staff, as the admin needs whole lists', async () => {
    const out = await run({ ...args }, { user: { collection: 'users', isActive: true } })
    expect(out).toEqual(args)
    expect(mocks.rateLimit).not.toHaveBeenCalled()
  })

  it('from our own server code, through the Local API', async () => {
    expect(await run({ ...args }, { api: 'local' })).toEqual(args)
    expect(mocks.rateLimit).not.toHaveBeenCalled()
  })

  it('for anything but reading', async () => {
    expect(await run({ ...args }, { operation: 'update' })).toEqual(args)
  })

  it('but not from disabled staff, who count as the public', async () => {
    const out = await run({ ...args }, { user: { collection: 'users', isActive: false } })
    expect(out.limit).toBe(PUBLIC_MAX_LIMIT)
  })
})
