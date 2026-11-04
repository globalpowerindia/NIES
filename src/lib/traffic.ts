import { createHmac } from 'node:crypto'

import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import type { Payload } from 'payload'

import { at, bucketKeys, num, rowsOf, type Range } from '@/lib/analytics'
import { env } from '@/lib/env'
import { deviceOf, productSlugOf, sourceOf } from '@/lib/traffic-rules'

/**
 * Storefront traffic for the admin dashboard, and the view count on the product
 * page. No cookies and no third party: a row holds no IP address or browser
 * details, only a keyed hash that changes daily. So a visitor counts once a day,
 * and rows can't be linked to a person or to each other across days. The cost
 * is that someone returning tomorrow counts as a new visitor.
 */

export const addPageViewsTable: PostgresSchemaHook = ({ schema }) => ({
  ...schema,
  tables: {
    ...schema.tables,
    page_views: pgTable(
      'page_views',
      {
        id: serial('id').primaryKey(),
        path: text('path').notNull(),
        productId: integer('product_id'),
        visitorKey: text('visitor_key').notNull(),
        /** Set only on the first page of a visit: that's the page a source sent them to. */
        source: text('source'),
        device: text('device').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      },
      (table) => [
        index('page_views_created_at_idx').on(table.createdAt),
        index('page_views_product_created_at_idx').on(table.productId, table.createdAt),
      ],
    ),
  },
})

const secret = `${env.PAYLOAD_SECRET}:page-view`

const visitorKey = (ip: string, userAgent: string) =>
  createHmac('sha256', secret)
    .update(JSON.stringify([ip, userAgent, new Date().toISOString().slice(0, 10)]))
    .digest('hex')

export type PageView = {
  path: string
  /** The first page of this visit, as opposed to moving around the shop. */
  entry: boolean
  referrer: string
  utmSource: string
  siteHost: string
  ip: string
  userAgent: string
}

export const recordPageView = async (payload: Payload, view: PageView): Promise<void> => {
  const slug = productSlugOf(view.path)
  const source = view.entry ? sourceOf(view.referrer, view.utmSource, view.siteHost) : null
  await payload.db.drizzle.execute(sql`
    INSERT INTO page_views (path, product_id, visitor_key, source, device)
    VALUES (
      ${view.path},
      (SELECT id FROM products WHERE slug = ${slug} AND status = 'ACTIVE'),
      ${visitorKey(view.ip, view.userAgent)},
      ${source},
      ${deviceOf(view.userAgent)}
    )
  `)
}

/** Visitors to a product in the last week, one per visitor per day. */
export const productViewCount = async (payload: Payload, productId: number): Promise<number> => {
  const rows = await rowsOf(payload, sql`
    SELECT COUNT(DISTINCT visitor_key) AS total FROM page_views
    WHERE product_id = ${productId} AND created_at >= now() - interval '7 days'
  `)
  return num(rows[0]?.total)
}

/** Housekeeping for the scheduled job. Enough for the 90-day range and the 90 days it compares with. */
export const deleteOldPageViews = async (payload: Payload): Promise<void> => {
  await payload.db.drizzle.execute(sql`DELETE FROM page_views WHERE created_at < now() - interval '190 days'`)
}

export type TrafficPoint = { key: string; views: number; visitors: number }

export type TrafficData = {
  current: { views: number; visitors: number }
  previous: { views: number; visitors: number }
  series: TrafficPoint[]
  sources: { name: string; visitors: number }[]
  devices: { name: string; visitors: number }[]
  topPages: { path: string; views: number }[]
  topProducts: { productId: number; name: string; views: number }[]
  /** Visitors who reached each step of buying. */
  journey: { products: number; cart: number; checkout: number }
}

/** Everything the dashboard's traffic panels show, for one range. Aggregated in Postgres. */
export const loadTrafficAnalytics = async (payload: Payload, range: Range): Promise<TrafficData> => {
  const { start, end, prevStart, bucket } = range
  const inRange = sql`v.created_at >= ${at(start)} AND v.created_at < ${at(end)}`
  const format = bucket === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'

  const [totals, series, sources, devices, topPages, topProducts, journey] = await Promise.all([
    rowsOf(payload, sql`
      SELECT
        COUNT(*) FILTER (WHERE v.created_at >= ${at(start)}) AS views,
        COUNT(DISTINCT v.visitor_key) FILTER (WHERE v.created_at >= ${at(start)}) AS visitors,
        COUNT(*) FILTER (WHERE v.created_at < ${at(start)}) AS prev_views,
        COUNT(DISTINCT v.visitor_key) FILTER (WHERE v.created_at < ${at(start)}) AS prev_visitors
      FROM page_views v
      WHERE v.created_at >= ${at(prevStart)} AND v.created_at < ${at(end)}
    `),
    rowsOf(payload, sql`
      SELECT to_char(date_trunc(${sql.raw(`'${bucket}'`)}, v.created_at AT TIME ZONE 'Asia/Kolkata'), ${sql.raw(`'${format}'`)}) AS key,
        COUNT(*) AS views, COUNT(DISTINCT v.visitor_key) AS visitors
      FROM page_views v
      WHERE ${inRange}
      GROUP BY 1
    `),
    rowsOf(payload, sql`
      SELECT v.source AS name, COUNT(DISTINCT v.visitor_key) AS visitors
      FROM page_views v
      WHERE ${inRange} AND v.source IS NOT NULL
      GROUP BY 1
      ORDER BY visitors DESC
    `),
    rowsOf(payload, sql`
      SELECT v.device AS name, COUNT(DISTINCT v.visitor_key) AS visitors
      FROM page_views v
      WHERE ${inRange}
      GROUP BY 1
      ORDER BY visitors DESC
    `),
    rowsOf(payload, sql`
      SELECT v.path, COUNT(*) AS views
      FROM page_views v
      WHERE ${inRange}
      GROUP BY 1
      ORDER BY views DESC, v.path ASC
      LIMIT 8
    `),
    rowsOf(payload, sql`
      SELECT p.id AS product_id, p.name, COUNT(*) AS views
      FROM page_views v JOIN products p ON p.id = v.product_id
      WHERE ${inRange}
      GROUP BY p.id, p.name
      ORDER BY views DESC, p.name ASC
      LIMIT 8
    `),
    rowsOf(payload, sql`
      SELECT
        COUNT(DISTINCT v.visitor_key) FILTER (WHERE v.path LIKE '/products/%') AS products,
        COUNT(DISTINCT v.visitor_key) FILTER (WHERE v.path = '/cart') AS cart,
        COUNT(DISTINCT v.visitor_key) FILTER (WHERE v.path LIKE '/checkout%') AS checkout
      FROM page_views v
      WHERE ${inRange}
    `),
  ])

  const t = totals[0] ?? {}
  const j = journey[0] ?? {}
  const byKey = new Map(series.map((row) => [String(row.key), row]))

  return {
    current: { views: num(t.views), visitors: num(t.visitors) },
    previous: { views: num(t.prev_views), visitors: num(t.prev_visitors) },
    series: bucketKeys(range).map((key) => ({
      key,
      views: num(byKey.get(key)?.views),
      visitors: num(byKey.get(key)?.visitors),
    })),
    sources: sources.map((row) => ({ name: String(row.name), visitors: num(row.visitors) })),
    devices: devices.map((row) => ({ name: String(row.name), visitors: num(row.visitors) })),
    topPages: topPages.map((row) => ({ path: String(row.path), views: num(row.views) })),
    topProducts: topProducts.map((row) => ({
      productId: num(row.product_id),
      name: String(row.name),
      views: num(row.views),
    })),
    journey: { products: num(j.products), cart: num(j.cart), checkout: num(j.checkout) },
  }
}
