import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { check } from 'drizzle-orm/pg-core'

/**
 * Payload maps `number` fields to Postgres `numeric`, which accepts decimals.
 * Field validators guard writes through Payload's API, but not raw SQL from
 * reconcile jobs, migrations or bulk imports. These constraints make "money is
 * whole paise" a property of the database rather than a convention.
 */
const wholeNonNegative = (column: string) =>
  check(`${column}_whole_non_negative`, sql.raw(`"${column}" >= 0 AND "${column}" = floor("${column}")`))

export const enforceIntegerMoney: PostgresSchemaHook = ({ extendTable, schema }) => {
  extendTable({
    table: schema.tables.product_variants,
    extraConfig: () => ({
      mrpPaise: wholeNonNegative('mrp_paise'),
      sellingPricePaise: wholeNonNegative('selling_price_paise'),
    }),
  })

  extendTable({
    table: schema.tables.products,
    extraConfig: () => ({
      gstRateBps: wholeNonNegative('gst_rate_bps'),
    }),
  })

  extendTable({
    table: schema.tables.orders,
    extraConfig: () => ({
      subtotalPaise: wholeNonNegative('subtotal_paise'),
      discountPaise: wholeNonNegative('discount_paise'),
      shippingPaise: wholeNonNegative('shipping_paise'),
      taxablePaise: wholeNonNegative('taxable_paise'),
      cgstPaise: wholeNonNegative('cgst_paise'),
      sgstPaise: wholeNonNegative('sgst_paise'),
      igstPaise: wholeNonNegative('igst_paise'),
      grandTotalPaise: wholeNonNegative('grand_total_paise'),
    }),
  })

  extendTable({
    table: schema.tables.inventory,
    extraConfig: () => ({
      onHand: wholeNonNegative('on_hand'),
      reserved: wholeNonNegative('reserved'),
    }),
  })

  return schema
}
