import { sql } from 'drizzle-orm'

import type { TransactionDB } from '@/lib/transaction'

/**
 * Products with edits saved as a draft and not yet published: their latest
 * version is a draft. A product never published at all counts too. One query,
 * so the products list can badge them and the CSV import can stay clear of
 * them (an import publishes, and would take the draft live with it).
 */
export const loadUnpublishedDrafts = async (db: TransactionDB): Promise<Set<number>> => {
  const { rows } = await db.execute(sql`
    SELECT parent_id FROM _products_v WHERE latest IS TRUE AND version__status = 'draft' AND parent_id IS NOT NULL
  `)
  return new Set(rows.map((row) => Number(row.parent_id)))
}
