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
      COALESCE(SUM(i.quantity), 0) AS last_30_days
    FROM orders_items i JOIN orders o ON o.id = i._parent_id
    WHERE i.product_id = ${productId}
      AND o.status IN (${SOLD})
      AND o.placed_at >= now() - interval '30 days'
  `)
  const row = rows[0] as { last_24_hours: string; last_30_days: string }
  return { last24Hours: Number(row.last_24_hours), last30Days: Number(row.last_30_days) }
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
