import { sql } from 'drizzle-orm'
import { createLocalReq, type PayloadRequest } from 'payload'

import { ensureInventory } from '@/lib/inventory'
import { relId } from '@/lib/storefront/products'
import { transactionDB } from '@/lib/transaction'

/**
 * An order's stock, through the stock ledger: checkout RESERVES each line,
 * payment turns the hold into SOLD, and an order that is never paid RELEASES
 * it. What an order still holds is worked out from its own ledger rows, so
 * releasing or selling twice can't move stock twice.
 */

export class OutOfStockError extends Error {
  constructor(readonly sku: string) {
    super(`Not enough stock for ${sku}.`)
  }
}

export type StockLine = { variantId: number; quantity: number; sku: string }

/**
 * Ledger rows written by orders are system movements, which the ledger refuses
 * from a staff user. The same transaction, minus the user.
 */
const systemReq = async (req: PayloadRequest): Promise<PayloadRequest> =>
  req.user ? createLocalReq({ req: { transactionID: await req.transactionID } }, req.payload) : req

const record = async (
  req: PayloadRequest,
  orderId: number,
  type: 'RESERVED' | 'RELEASED' | 'SOLD',
  variantId: number,
  quantity: number,
  note?: string,
) => {
  await req.payload.create({
    collection: 'stock-movements',
    data: { variant: variantId, type, quantity, order: orderId, note },
    req: await systemReq(req),
  })
}

/**
 * Holds every line for the order, or none: a line that can't be held throws
 * and the caller's transaction rolls back the others. Each stock row is locked
 * while it's checked, so two checkouts can't both take the last unit.
 */
export const reserveOrderStock = async (req: PayloadRequest, orderId: number, lines: StockLine[]) => {
  const db = await transactionDB(req)
  for (const line of lines) {
    const inventory = await ensureInventory(await systemReq(req), line.variantId)
    const { rows } = await db.execute(sql`
      SELECT on_hand, reserved, allow_backorder FROM inventory WHERE id = ${inventory.id} FOR UPDATE
    `)
    const row = rows[0] as { on_hand: number; reserved: number; allow_backorder: boolean | null }
    const available = Number(row.on_hand) - Number(row.reserved)
    if (!row.allow_backorder && available < line.quantity) throw new OutOfStockError(line.sku)
    await record(req, orderId, 'RESERVED', line.variantId, line.quantity)
  }
}

/** Units the order still holds, per variant. */
export const heldStock = async (req: PayloadRequest, orderId: number): Promise<Map<number, number>> => {
  const { docs } = await req.payload.find({
    collection: 'stock-movements',
    where: { order: { equals: orderId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const held = new Map<number, number>()
  for (const movement of docs) {
    const variantId = relId(movement.variant)
    if (variantId === undefined) continue
    const sign = movement.type === 'RESERVED' ? 1 : movement.type === 'RELEASED' || movement.type === 'SOLD' ? -1 : 0
    held.set(variantId, (held.get(variantId) ?? 0) + sign * Number(movement.quantity))
  }
  for (const [variantId, quantity] of held) if (quantity <= 0) held.delete(variantId)
  return held
}

export const releaseOrderStock = async (req: PayloadRequest, orderId: number) => {
  for (const [variantId, quantity] of await heldStock(req, orderId)) {
    await record(req, orderId, 'RELEASED', variantId, quantity)
  }
}

/**
 * Turns the order's holds into sales. A backordered line has no units on hand
 * to take, so its hold is released instead and returned for staff to follow up.
 */
export const sellOrderStock = async (req: PayloadRequest, orderId: number): Promise<number[]> => {
  const db = await transactionDB(req)
  const backordered: number[] = []
  for (const [variantId, quantity] of await heldStock(req, orderId)) {
    const { rows } = await db.execute(sql`
      SELECT on_hand FROM inventory WHERE variant_id = ${variantId} FOR UPDATE
    `)
    if (Number(rows[0]?.on_hand ?? 0) >= quantity) {
      await record(req, orderId, 'SOLD', variantId, quantity)
    } else {
      await record(req, orderId, 'RELEASED', variantId, quantity, 'Backordered: not enough on hand when paid.')
      backordered.push(variantId)
    }
  }
  return backordered
}
