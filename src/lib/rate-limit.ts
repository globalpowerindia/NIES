import { createHmac } from 'node:crypto'

import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import type { Payload } from 'payload'

import { env } from '@/lib/env'

/**
 * Fixed-window rate limits shared by every server instance: one row per key,
 * counted by a single atomic upsert, so parallel requests on different
 * instances can't each see "under the limit". In-memory counters would reset
 * on every cold start and differ per instance.
 *
 * Keys are HMACed before storage, so the table never holds raw IPs or emails.
 */

export const addRateLimitTable: PostgresSchemaHook = ({ schema }) => ({
  ...schema,
  tables: {
    ...schema.tables,
    rate_limit_buckets: pgTable('rate_limit_buckets', {
      key: text('key').primaryKey(),
      windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
      hits: integer('hits').notNull(),
    }),
  },
})

const secret = `${env.PAYLOAD_SECRET}:rate-limit`
const bucketKey = (key: string) => createHmac('sha256', secret).update(key).digest('hex')

export type RateLimit = { limit: number; windowSeconds: number }

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

export const rateLimit = async (payload: Payload, key: string, { limit, windowSeconds }: RateLimit): Promise<RateLimitResult> => {
  const result = await payload.db.drizzle.execute(sql`
    INSERT INTO rate_limit_buckets (key, window_start, hits)
    VALUES (${bucketKey(key)}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN rate_limit_buckets.window_start <= now() - make_interval(secs => ${windowSeconds})
                  THEN 1 ELSE rate_limit_buckets.hits + 1 END,
      window_start = CASE WHEN rate_limit_buckets.window_start <= now() - make_interval(secs => ${windowSeconds})
                  THEN now() ELSE rate_limit_buckets.window_start END
    RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSeconds}) - now()))))::int AS retry_after
  `)
  const row = result.rows[0] as { hits: number; retry_after: number }
  return Number(row.hits) <= limit ? { ok: true } : { ok: false, retryAfterSeconds: Number(row.retry_after) }
}

/** Housekeeping for the scheduled job: windows that ended over a day ago. */
export const deleteStaleRateLimits = async (payload: Payload): Promise<void> => {
  await payload.db.drizzle.execute(sql`DELETE FROM rate_limit_buckets WHERE window_start < now() - interval '1 day'`)
}

/** The limits in one place, so they can be tuned without hunting through routes. */
export const LIMITS = {
  /** Cart writes: generous for real shoppers, a ceiling for scripts creating carts. */
  cartWrite: { limit: 60, windowSeconds: 60 },
  /** Coupon guesses: codes are short, so brute force is the risk. */
  couponTry: { limit: 10, windowSeconds: 10 * 60 },
  newsletter: { limit: 5, windowSeconds: 60 * 60 },
  accountWrite: { limit: 30, windowSeconds: 60 },
  staffPasswordReset: { limit: 5, windowSeconds: 60 * 60 },
  /** Placing an order opens a Razorpay order each time; a ceiling against scripted checkouts. */
  checkout: { limit: 10, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimit>
