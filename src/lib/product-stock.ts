import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'

/**
 * Price and stock at a glance, per product, for the admin: what the card
 * would charge, how many can be bought, and whether it can be sold at all.
 * One query over every product, so the list can filter on it.
 */

export type StockLevel = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export type ProductStock = {
  /** The card's price: the default variant's, else the first active one's. Null with no active variant. */
  pricePaise: number | null
  mrpPaise: number | null
  activeVariants: number
  /** Sum of on hand minus reserved across active variants. */
  available: number
  backorder: boolean
  /** The best level among active variants; backorder counts as in stock. */
  level: StockLevel
}

export const loadProductStock = async (
  payload: Payload,
  productIds?: number[],
): Promise<Map<number, ProductStock>> => {
  if (productIds && productIds.length === 0) return new Map()
  const scope = productIds
    ? sql`WHERE p.id IN (${sql.join(
        productIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``
  const result = await payload.db.drizzle.execute(sql`
    SELECT
      p.id,
      card.selling_price_paise,
      card.mrp_paise,
      (SELECT count(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active IS TRUE) AS active_variants,
      COALESCE(stock.available, 0) AS available,
      COALESCE(stock.backorder, FALSE) AS backorder,
      COALESCE(stock.in_stock, FALSE) AS in_stock,
      COALESCE(stock.low_stock, FALSE) AS low_stock
    FROM products p
    LEFT JOIN LATERAL (
      SELECT pv.selling_price_paise, pv.mrp_paise
      FROM product_variants pv
      WHERE pv.product_id = p.id AND pv.is_active IS TRUE
      ORDER BY pv.is_default IS TRUE DESC, pv.sort_order ASC NULLS LAST, pv.id
      LIMIT 1
    ) card ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        sum(COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) AS available,
        bool_or(i.allow_backorder IS TRUE) AS backorder,
        bool_or(i.stock_status = 'IN_STOCK') AS in_stock,
        bool_or(i.stock_status = 'LOW_STOCK') AS low_stock
      FROM inventory i
      JOIN product_variants pv ON pv.id = i.variant_id AND pv.is_active IS TRUE
      WHERE i.product_id = p.id
    ) stock ON TRUE
    ${scope}
  `)

  const out = new Map<number, ProductStock>()
  for (const row of result.rows) {
    const backorder = Boolean(row.backorder)
    out.set(Number(row.id), {
      pricePaise: row.selling_price_paise === null ? null : Number(row.selling_price_paise),
      mrpPaise: row.mrp_paise === null ? null : Number(row.mrp_paise),
      activeVariants: Number(row.active_variants),
      available: Number(row.available),
      backorder,
      level: backorder || row.in_stock ? 'IN_STOCK' : row.low_stock ? 'LOW_STOCK' : 'OUT_OF_STOCK',
    })
  }
  return out
}

/** A product can be sold once it has an active variant with a price above zero. */
export const isPriced = (stock: ProductStock | undefined) =>
  Boolean(stock && stock.pricePaise && stock.pricePaise > 0)
