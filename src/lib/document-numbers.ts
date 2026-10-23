import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { integer, pgTable, text } from 'drizzle-orm/pg-core'

import type { TransactionDB } from '@/lib/transaction'

/**
 * Order and invoice numbers: `PT-2627-000015`, `INV-2627-000001`. Each series
 * restarts every Indian financial year (April to March) and has no gaps, which
 * GST requires of invoices. A Postgres sequence can't promise that (a rolled
 * back transaction burns its value), so each series is one counter row,
 * incremented inside the transaction that uses the number: roll back and the
 * number is never taken.
 */

export const addDocumentCountersTable: PostgresSchemaHook = ({ schema }) => ({
  ...schema,
  tables: {
    ...schema.tables,
    document_counters: pgTable('document_counters', {
      key: text('key').primaryKey(),
      value: integer('value').notNull(),
    }),
  },
})

/** "2627" for April 2026 to March 2027, in India time. */
export const financialYearCode = (at: Date): string => {
  const ist = new Date(at.getTime() + 5.5 * 60 * 60 * 1000)
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1
  return `${String(start % 100).padStart(2, '0')}${String((start + 1) % 100).padStart(2, '0')}`
}

const SERIES = {
  order: { prefix: 'PT', column: sql.raw('order_number') },
  invoice: { prefix: 'INV', column: sql.raw('invoice_number') },
} as const

export type DocumentSeries = keyof typeof SERIES

/**
 * The next number in a series. Must run inside the transaction that stores it.
 * The first number of a year continues from the highest already on an order,
 * so numbers issued before this counter existed are never reused.
 */
export const nextDocumentNumber = async (db: TransactionDB, series: DocumentSeries, at: Date): Promise<string> => {
  const { prefix, column } = SERIES[series]
  const stem = `${prefix}-${financialYearCode(at)}-`
  // Typed, or Postgres binds the parameter as text and runs the regex form of substring().
  const from = sql`${stem.length + 1}::integer`
  const result = await db.execute(sql`
    INSERT INTO document_counters (key, value)
    VALUES (
      ${stem},
      1 + COALESCE((
        SELECT MAX(CAST(substring(${column} FROM ${from}) AS integer))
        FROM orders
        WHERE ${column} LIKE ${`${stem}%`} AND substring(${column} FROM ${from}) ~ '^[0-9]+$'
      ), 0)
    )
    ON CONFLICT (key) DO UPDATE SET value = document_counters.value + 1
    RETURNING value
  `)
  return `${stem}${String(result.rows[0].value).padStart(6, '0')}`
}
