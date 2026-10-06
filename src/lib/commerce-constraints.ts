import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * Rules the application relies on that two simultaneous requests could
 * otherwise break. The code takes a lock before creating a cart; this index
 * is what makes "one active cart per customer" true even if it didn't.
 */
export const enforceCommerceInvariants: PostgresSchemaHook = ({ extendTable, schema }) => {
  extendTable({
    table: schema.tables.carts,
    extraConfig: (table) => ({
      oneActiveCartPerCustomer: uniqueIndex('carts_one_active_per_customer')
        .on(table.customer)
        .where(sql`"status" = 'ACTIVE' AND "customer_id" IS NOT NULL`),
    }),
  })

  return schema
}
