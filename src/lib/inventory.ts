import { sql } from 'drizzle-orm'
import { APIError, type PayloadRequest } from 'payload'

export const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]

/**
 * Every way stock can change. Staff record the first five from the admin;
 * the last three are written only by checkout and order code.
 */
export const MOVEMENT_TYPES = {
  RECEIVED: { label: 'Stock received', onHand: 1, reserved: 0, system: false },
  RETURNED: { label: 'Customer return', onHand: 1, reserved: 0, system: false },
  ADJUST_UP: { label: 'Count correction (add)', onHand: 1, reserved: 0, system: false },
  ADJUST_DOWN: { label: 'Count correction (remove)', onHand: -1, reserved: 0, system: false },
  DAMAGED: { label: 'Damaged or lost', onHand: -1, reserved: 0, system: false },
  RESERVED: { label: 'Held for an order', onHand: 0, reserved: 1, system: true },
  RELEASED: { label: 'Hold released', onHand: 0, reserved: -1, system: true },
  SOLD: { label: 'Sold (order paid)', onHand: -1, reserved: -1, system: true },
} as const

export type MovementType = keyof typeof MOVEMENT_TYPES

export const stockStatusOf = (available: number, lowStockThreshold: number): StockStatus =>
  available <= 0 ? 'OUT_OF_STOCK' : available <= lowStockThreshold ? 'LOW_STOCK' : 'IN_STOCK'

type DrizzleLike = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }
type DrizzleAdapterLike = {
  drizzle: DrizzleLike
  sessions?: Record<string | number, { db: DrizzleLike } | undefined>
}

/** The drizzle handle for the request's open transaction, so the stock update commits or rolls back with the movement row. */
const dbFor = async (req: PayloadRequest): Promise<DrizzleLike> => {
  const adapter = req.payload.db as unknown as DrizzleAdapterLike
  const id = req.transactionID ? await req.transactionID : undefined
  return (id !== undefined && adapter.sessions?.[id]?.db) || adapter.drizzle
}

export type StockBalance = { onHand: number; reserved: number; status: StockStatus }

/**
 * Applies a signed change as one conditional UPDATE. Read-then-write would
 * lose one of two simultaneous adjustments; this can't. The WHERE clause
 * refuses to take stock below zero, so an oversized removal fails instead of
 * leaving a negative count.
 */
export const applyStockChange = async (
  req: PayloadRequest,
  inventoryId: number | string,
  onHandDelta: number,
  reservedDelta: number,
): Promise<StockBalance> => {
  const db = await dbFor(req)
  const result = await db.execute(sql`
    UPDATE "inventory"
    SET
      "on_hand" = "on_hand" + ${onHandDelta},
      "reserved" = "reserved" + ${reservedDelta},
      "stock_status" = (CASE
        WHEN "on_hand" + ${onHandDelta} - ("reserved" + ${reservedDelta}) <= 0 THEN 'OUT_OF_STOCK'
        WHEN "on_hand" + ${onHandDelta} - ("reserved" + ${reservedDelta}) <= "low_stock_threshold" THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END)::"enum_inventory_stock_status",
      "updated_at" = now()
    WHERE "id" = ${inventoryId}
      AND "on_hand" + ${onHandDelta} >= 0
      AND "reserved" + ${reservedDelta} >= 0
    RETURNING "on_hand", "reserved", "stock_status"
  `)

  const row = result.rows[0]
  if (!row) {
    throw new APIError('Not enough stock for that change. Check the current count first.', 400, undefined, true)
  }
  return {
    onHand: Number(row.on_hand),
    reserved: Number(row.reserved),
    status: row.stock_status as StockStatus,
  }
}

/** Finds the stock row for a variant, creating an empty one the first time. */
export const ensureInventory = async (req: PayloadRequest, variantId: number | string) => {
  const existing = await req.payload.find({
    collection: 'inventory',
    where: { variant: { equals: variantId } },
    limit: 1,
    depth: 0,
    req,
  })
  if (existing.docs[0]) return existing.docs[0]

  return req.payload.create({
    collection: 'inventory',
    data: { variant: Number(variantId) },
    req,
  })
}
