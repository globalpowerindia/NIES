import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'

/**
 * Sales analytics for the admin dashboard.
 *
 * One rule decides what counts as a sale: an order that was paid for and is
 * still going ahead (`SOLD_STATUSES`). Unpaid, cancelled and returned orders
 * are left out of revenue, units and averages, but still appear in the status
 * breakdown so the shop can see them.
 *
 * Days are Indian Standard Time days (the shop's day, not the server's), and
 * every amount stays in paise until it is displayed. Everything is aggregated
 * in Postgres: a dashboard must not load every order into memory.
 */

export const SOLD_STATUSES = ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const

// A constant list, inlined so the enum column compares with literals.
const SOLD = sql.raw(SOLD_STATUSES.map((status) => `'${status}'`).join(', '))

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export const RANGES = {
  '7d': { label: '7 days', days: 7, bucket: 'day' },
  '30d': { label: '30 days', days: 30, bucket: 'day' },
  '90d': { label: '90 days', days: 90, bucket: 'day' },
  '12m': { label: '12 months', days: 0, bucket: 'month' },
} as const

export type RangeKey = keyof typeof RANGES
export type Bucket = (typeof RANGES)[RangeKey]['bucket']

export const DEFAULT_RANGE: RangeKey = '30d'

export type Range = {
  key: RangeKey
  bucket: Bucket
  /** The current window: [start, end). */
  start: Date
  end: Date
  /** The window of the same length just before it, for comparisons. */
  prevStart: Date
}

/** Year, month (0-based) and day of a moment, as read on a clock in India. */
const istParts = (date: Date) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS)
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() }
}

/** Midnight in India on the given calendar day, as an instant. */
const istMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - IST_OFFSET_MS)

// Own keys only: `in` would also accept `?range=toString` and the like.
export const isRangeKey = (value: unknown): value is RangeKey => typeof value === 'string' && Object.hasOwn(RANGES, value)

/**
 * The window a range covers, up to `now`. Day ranges start at midnight IST
 * and include today; the 12-month range starts on the first of the month
 * eleven months back, so it shows twelve whole calendar months.
 */
export const resolveRange = (key: RangeKey, now: Date = new Date()): Range => {
  const { days, bucket } = RANGES[key]
  const { y, m, d } = istParts(now)
  const start = bucket === 'month' ? istMidnight(y, m - 11, 1) : istMidnight(y, m, d - (days - 1))
  const end = now
  return { key, bucket, start, end, prevStart: new Date(start.getTime() - (end.getTime() - start.getTime())) }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Every bucket label in the range, in order: `YYYY-MM-DD` for days, `YYYY-MM` for months. */
export const bucketKeys = (range: Range): string[] => {
  const keys: string[] = []
  const { y, m, d } = istParts(range.start)
  if (range.bucket === 'month') {
    for (let i = 0; ; i++) {
      const month = istMidnight(y, m + i, 1)
      if (month >= range.end) break
      const parts = istParts(month)
      keys.push(`${parts.y}-${pad(parts.m + 1)}`)
    }
    return keys
  }
  for (let t = istMidnight(y, m, d).getTime(); t < range.end.getTime(); t += DAY_MS) {
    const parts = istParts(new Date(t))
    keys.push(`${parts.y}-${pad(parts.m + 1)}-${pad(parts.d)}`)
  }
  return keys
}

export type SeriesPoint = { key: string; revenuePaise: number; orders: number }

/** One point per bucket, zero where nothing sold, so the chart's x-axis is honest. */
export const fillSeries = (keys: string[], rows: SeriesPoint[]): SeriesPoint[] => {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  return keys.map((key) => byKey.get(key) ?? { key, revenuePaise: 0, orders: 0 })
}

/** Change from the previous period as a fraction, or null when there's nothing to compare with. */
export const change = (current: number, previous: number): number | null =>
  previous > 0 ? (current - previous) / previous : null

const at = (date: Date) => sql`${date.toISOString()}::timestamptz`
const num = (value: unknown) => Number(value ?? 0)

export type Totals = { revenuePaise: number; orders: number; units: number; discountPaise: number; newCustomers: number }

export type DashboardData = {
  range: Range
  current: Totals
  previous: Totals
  series: SeriesPoint[]
  statuses: { status: string; orders: number }[]
  topProducts: { productId: number | null; name: string; units: number; revenuePaise: number }[]
  categories: { name: string; revenuePaise: number }[]
  states: { name: string; orders: number; revenuePaise: number }[]
}

const rowsOf = async (payload: Payload, query: ReturnType<typeof sql>) =>
  (await payload.db.drizzle.execute(query)).rows as Record<string, unknown>[]

/** Everything the dashboard's sales panels show, for one range. */
export const loadSalesAnalytics = async (payload: Payload, range: Range): Promise<DashboardData> => {
  const { start, end, prevStart, bucket } = range
  const sold = sql`o.status IN (${SOLD})`
  const inRange = sql`o.placed_at >= ${at(start)} AND o.placed_at < ${at(end)}`
  const format = bucket === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'

  const [totals, units, customers, series, statuses, topProducts, categories, states] = await Promise.all([
    rowsOf(payload, sql`
      SELECT
        COUNT(*) FILTER (WHERE o.placed_at >= ${at(start)}) AS orders,
        COALESCE(SUM(o.grand_total_paise) FILTER (WHERE o.placed_at >= ${at(start)}), 0) AS revenue,
        COALESCE(SUM(o.discount_paise) FILTER (WHERE o.placed_at >= ${at(start)}), 0) AS discount,
        COUNT(*) FILTER (WHERE o.placed_at < ${at(start)}) AS prev_orders,
        COALESCE(SUM(o.grand_total_paise) FILTER (WHERE o.placed_at < ${at(start)}), 0) AS prev_revenue,
        COALESCE(SUM(o.discount_paise) FILTER (WHERE o.placed_at < ${at(start)}), 0) AS prev_discount
      FROM orders o
      WHERE ${sold} AND o.placed_at >= ${at(prevStart)} AND o.placed_at < ${at(end)}
    `),
    rowsOf(payload, sql`
      SELECT
        COALESCE(SUM(i.quantity) FILTER (WHERE o.placed_at >= ${at(start)}), 0) AS units,
        COALESCE(SUM(i.quantity) FILTER (WHERE o.placed_at < ${at(start)}), 0) AS prev_units
      FROM orders_items i JOIN orders o ON o.id = i._parent_id
      WHERE ${sold} AND o.placed_at >= ${at(prevStart)} AND o.placed_at < ${at(end)}
    `),
    rowsOf(payload, sql`
      SELECT
        COUNT(*) FILTER (WHERE c.created_at >= ${at(start)}) AS current,
        COUNT(*) FILTER (WHERE c.created_at < ${at(start)}) AS previous
      FROM customers c
      WHERE c.created_at >= ${at(prevStart)} AND c.created_at < ${at(end)}
    `),
    rowsOf(payload, sql`
      SELECT to_char(date_trunc(${sql.raw(`'${bucket}'`)}, o.placed_at AT TIME ZONE 'Asia/Kolkata'), ${sql.raw(`'${format}'`)}) AS key,
        COUNT(*) AS orders, SUM(o.grand_total_paise) AS revenue
      FROM orders o
      WHERE ${sold} AND ${inRange}
      GROUP BY 1
    `),
    rowsOf(payload, sql`
      SELECT o.status, COUNT(*) AS orders FROM orders o WHERE ${inRange} GROUP BY o.status
    `),
    rowsOf(payload, sql`
      SELECT i.product_id, MAX(i.product_name) AS name, SUM(i.quantity) AS units, SUM(i.line_net_paise) AS revenue
      FROM orders_items i JOIN orders o ON o.id = i._parent_id
      WHERE ${sold} AND ${inRange}
      GROUP BY i.product_id, CASE WHEN i.product_id IS NULL THEN i.product_name END
      ORDER BY revenue DESC
      LIMIT 8
    `),
    rowsOf(payload, sql`
      SELECT COALESCE(c.name, 'Uncategorised') AS name, SUM(i.line_net_paise) AS revenue
      FROM orders_items i
        JOIN orders o ON o.id = i._parent_id
        LEFT JOIN products p ON p.id = i.product_id
        LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${sold} AND ${inRange}
      GROUP BY 1
      ORDER BY revenue DESC
    `),
    rowsOf(payload, sql`
      SELECT COALESCE(o.ship_state_name, 'Unknown') AS name, COUNT(*) AS orders, SUM(o.grand_total_paise) AS revenue
      FROM orders o
      WHERE ${sold} AND ${inRange}
      GROUP BY 1
      ORDER BY revenue DESC
    `),
  ])

  const t = totals[0] ?? {}
  const u = units[0] ?? {}
  const c = customers[0] ?? {}

  return {
    range,
    current: { revenuePaise: num(t.revenue), orders: num(t.orders), units: num(u.units), discountPaise: num(t.discount), newCustomers: num(c.current) },
    previous: { revenuePaise: num(t.prev_revenue), orders: num(t.prev_orders), units: num(u.prev_units), discountPaise: num(t.prev_discount), newCustomers: num(c.previous) },
    series: fillSeries(
      bucketKeys(range),
      series.map((row) => ({ key: String(row.key), revenuePaise: num(row.revenue), orders: num(row.orders) })),
    ),
    statuses: statuses.map((row) => ({ status: String(row.status), orders: num(row.orders) })),
    topProducts: topProducts.map((row) => ({
      productId: row.product_id == null ? null : num(row.product_id),
      name: String(row.name),
      units: num(row.units),
      revenuePaise: num(row.revenue),
    })),
    categories: categories.map((row) => ({ name: String(row.name), revenuePaise: num(row.revenue) })),
    states: states.map((row) => ({ name: String(row.name), orders: num(row.orders), revenuePaise: num(row.revenue) })),
  }
}

export type AttentionData = {
  /** Paid orders not yet shipped, oldest first. */
  toShip: { id: number; orderNumber: string; customerName: string; status: string; placedAt: string }[]
  toShipCount: number
  /** Variants at or under their threshold, emptiest first. */
  lowStock: { productId: number | null; name: string; sku: string; available: number; status: string }[]
  lowStockCount: number
}

/** Orders waiting to go out. Shown to anyone who can see orders. */
export const loadOrdersToShip = async (payload: Payload) => {
  const result = await payload.find({
    collection: 'orders',
    where: { status: { in: ['CONFIRMED', 'PACKED'] } },
    sort: 'placedAt',
    limit: 6,
    depth: 0,
    overrideAccess: true,
    select: { orderNumber: true, customerName: true, status: true, placedAt: true },
  })
  return {
    toShip: result.docs.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      placedAt: order.placedAt,
    })),
    toShipCount: result.totalDocs,
  }
}

/** Variants running out. Shown to anyone who can see stock levels. */
export const loadLowStock = async (payload: Payload) => {
  const [rows, count] = await Promise.all([
    rowsOf(payload, sql`
      SELECT inv.product_id, COALESCE(p.name, inv.sku) AS name, v.name AS variant, inv.sku,
        inv.on_hand - inv.reserved AS available, inv.stock_status
      FROM inventory inv
        LEFT JOIN products p ON p.id = inv.product_id
        LEFT JOIN product_variants v ON v.id = inv.variant_id
      WHERE inv.stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK') AND v.is_active IS NOT FALSE
      ORDER BY available ASC, name ASC
      LIMIT 8
    `),
    rowsOf(payload, sql`
      SELECT COUNT(*) AS n
      FROM inventory inv LEFT JOIN product_variants v ON v.id = inv.variant_id
      WHERE inv.stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK') AND v.is_active IS NOT FALSE
    `),
  ])
  return {
    lowStock: rows.map((row) => ({
      productId: row.product_id == null ? null : num(row.product_id),
      name: row.variant && row.variant !== 'Standard' ? `${row.name} · ${row.variant}` : String(row.name),
      sku: String(row.sku ?? ''),
      available: num(row.available),
      status: String(row.stock_status),
    })),
    lowStockCount: num(count[0]?.n),
  }
}
