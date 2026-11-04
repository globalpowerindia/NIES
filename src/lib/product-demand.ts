import { createHmac } from 'node:crypto'

import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import type { Payload } from 'payload'

import { SOLD_STATUSES } from '@/lib/analytics'
import { env } from '@/lib/env'

/**
 * Real demand figures for the product page: units from orders (the same rule
 * as the sales dashboard), and enquiries from clicks on the WhatsApp button,
 * whose sales never become orders on this site.
 *
 * An enquiry row holds no IP address or browser details, only a keyed hash
 * that changes daily. So a visitor counts once per product per day, and rows
 * can't be linked to a person or to each other across days.
 */

export const addProductEnquiriesTable: PostgresSchemaHook = ({ schema }) => ({
  ...schema,
  tables: {
    ...schema.tables,
    product_enquiries: pgTable(
      'product_enquiries',
      {
        productId: integer('product_id').notNull(),
        visitorKey: text('visitor_key').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      },
      (table) => [primaryKey({ columns: [table.productId, table.visitorKey] })],
    ),
  },
})

const secret = `${env.PAYLOAD_SECRET}:product-enquiry`
const SOLD = sql.raw(SOLD_STATUSES.map((status) => `'${status}'`).join(', '))

const visitorKey = (slug: string, ip: string, userAgent: string) =>
  createHmac('sha256', secret)
    .update(JSON.stringify([slug, ip, userAgent, new Date().toISOString().slice(0, 10)]))
    .digest('hex')

/** Counts one enquiry. Unknown products, and those sold online, are ignored. */
export const recordEnquiry = async (
  payload: Payload,
  slug: string,
  visitor: { ip: string; userAgent: string },
): Promise<void> => {
  await payload.db.drizzle.execute(sql`
    INSERT INTO product_enquiries (product_id, visitor_key)
    SELECT p.id, ${visitorKey(slug, visitor.ip, visitor.userAgent)}
    FROM products p
    WHERE p.slug = ${slug} AND p.sell_online IS NOT TRUE
    ON CONFLICT DO NOTHING
  `)
}

export const soldCounts = async (payload: Payload, productId: number) => {
  const { rows } = await payload.db.drizzle.execute(sql`
    SELECT
      COALESCE(SUM(i.quantity) FILTER (WHERE o.placed_at >= now() - interval '24 hours'), 0) AS last_24_hours,
      COALESCE(SUM(i.quantity) FILTER (WHERE o.placed_at >= now() - interval '7 days'), 0) AS last_7_days,
      COALESCE(SUM(i.quantity) FILTER (WHERE o.placed_at >= now() - interval '30 days'), 0) AS last_30_days,
      COALESCE(SUM(i.quantity), 0) AS all_time
    FROM orders_items i JOIN orders o ON o.id = i._parent_id
    WHERE i.product_id = ${productId}
      AND o.status IN (${SOLD})
  `)
  const row = rows[0] as { last_24_hours: string; last_7_days: string; last_30_days: string; all_time: string }
  return {
    last24Hours: Number(row.last_24_hours),
    last7Days: Number(row.last_7_days),
    last30Days: Number(row.last_30_days),
    allTime: Number(row.all_time),
  }
}

export const enquiryCount = async (payload: Payload, productId: number): Promise<number> => {
  const { rows } = await payload.db.drizzle.execute(sql`
    SELECT COUNT(*) AS total FROM product_enquiries
    WHERE product_id = ${productId} AND created_at >= now() - interval '7 days'
  `)
  return Number((rows[0] as { total: string }).total)
}

/** Housekeeping for the scheduled job: the page never looks back further than 7 days. */
export const deleteOldEnquiries = async (payload: Payload): Promise<void> => {
  await payload.db.drizzle.execute(sql`DELETE FROM product_enquiries WHERE created_at < now() - interval '8 days'`)
}

export type ProductActivity = { views7Days: number; views30Days: number; sold30Days: number; soldAllTime: number }

/** Views and online sales for one page of the admin's product list. One query each, however long the page. */
export const loadProductActivity = async (payload: Payload, productIds: number[]): Promise<Map<number, ProductActivity>> => {
  const activity = new Map<number, ProductActivity>()
  if (productIds.length === 0) return activity
  const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `)
  const [views, sold] = await Promise.all([
    payload.db.drizzle.execute(sql`
      SELECT product_id,
        COUNT(DISTINCT visitor_key) FILTER (WHERE created_at >= now() - interval '7 days') AS views_7,
        COUNT(DISTINCT visitor_key) AS views_30
      FROM page_views
      WHERE product_id IN (${ids}) AND created_at >= now() - interval '30 days'
      GROUP BY product_id
    `),
    payload.db.drizzle.execute(sql`
      SELECT i.product_id,
        COALESCE(SUM(i.quantity) FILTER (WHERE o.placed_at >= now() - interval '30 days'), 0) AS sold_30,
        COALESCE(SUM(i.quantity), 0) AS sold_all
      FROM orders_items i JOIN orders o ON o.id = i._parent_id
      WHERE i.product_id IN (${ids}) AND o.status IN (${SOLD})
      GROUP BY i.product_id
    `),
  ])
  const entry = (id: number) => {
    const existing = activity.get(id)
    if (existing) return existing
    const fresh = { views7Days: 0, views30Days: 0, sold30Days: 0, soldAllTime: 0 }
    activity.set(id, fresh)
    return fresh
  }
  for (const row of views.rows as Record<string, unknown>[]) {
    Object.assign(entry(Number(row.product_id)), { views7Days: Number(row.views_7), views30Days: Number(row.views_30) })
  }
  for (const row of sold.rows as Record<string, unknown>[]) {
    Object.assign(entry(Number(row.product_id)), { sold30Days: Number(row.sold_30), soldAllTime: Number(row.sold_all) })
  }
  return activity
}
