import type { PostgresSchemaHook } from '@payloadcms/drizzle/postgres'
import { sql } from 'drizzle-orm'
import { customType, index } from 'drizzle-orm/pg-core'

/** Drizzle has no `tsvector`, and Payload has no field type that maps to one. */
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' })

/**
 * The searchable form of a product, derived in the database from the three
 * denormalised columns `fillSearchDocument` writes (src/lib/search-document.ts).
 *
 * Weights follow the plan: A is what people type (name, brand, model, SKU),
 * B is the category path, C is description and spec values. `english` stems
 * prose so "drills" finds "drill"; `simple` is applied alongside it to the
 * columns holding codes, so "GPG-6D" and "18V" survive unstemmed.
 *
 * `to_tsvector` is only IMMUTABLE — and so only legal in a generated column —
 * when the config is passed explicitly, hence the literal 'english'/'simple'.
 */
const weighted = sql`
  setweight(to_tsvector('english', coalesce(search_a, '')), 'A') ||
  setweight(to_tsvector('simple',  coalesce(search_a, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(search_b, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(search_c, '')), 'C') ||
  setweight(to_tsvector('simple',  coalesce(search_c, '')), 'C')
`

export const addSearchVector: PostgresSchemaHook = ({ extendTable, schema }) => {
  extendTable({
    table: schema.tables.products,
    columns: {
      searchVector: tsvector('search_vector').generatedAlwaysAs(weighted),
    },
    extraConfig: (table) => ({
      searchVectorIdx: index('products_search_vector_idx').using('gin', table.searchVector),
      // Trigram index for the typo fallback: "makitta" -> Makita.
      searchTrigramIdx: index('products_search_a_trgm_idx').using('gin', sql`search_a gin_trgm_ops`),
    }),
  })

  return schema
}
