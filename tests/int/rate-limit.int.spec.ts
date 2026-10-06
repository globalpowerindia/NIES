import { randomBytes } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { rateLimit } from '@/lib/rate-limit'
import config from '@/payload.config'

let payload: Payload
const key = () => `test:${randomBytes(6).toString('hex')}`

describe('Rate limits', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('lets exactly the limit through when requests arrive at once', async () => {
    const bucket = key()
    const results = await Promise.all(Array.from({ length: 12 }, () => rateLimit(payload, bucket, { limit: 5, windowSeconds: 60 })))

    expect(results.filter((r) => r.ok)).toHaveLength(5)
    const refused = results.find((r) => !r.ok)
    expect(refused && !refused.ok && refused.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('keeps separate keys separate', async () => {
    const limit = { limit: 1, windowSeconds: 60 }
    expect((await rateLimit(payload, key(), limit)).ok).toBe(true)
    expect((await rateLimit(payload, key(), limit)).ok).toBe(true)
  })

  it('starts counting again once the window has passed', async () => {
    const bucket = key()
    const limit = { limit: 1, windowSeconds: 60 }
    await rateLimit(payload, bucket, limit)
    expect((await rateLimit(payload, bucket, limit)).ok).toBe(false)

    await payload.db.drizzle.execute(sql`UPDATE rate_limit_buckets SET window_start = now() - interval '2 minutes'`)
    expect((await rateLimit(payload, bucket, limit)).ok).toBe(true)
  })
})
