import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'
import { cache } from 'react'

/**
 * Product search, in three passes, cheapest and most certain first. Everything
 * runs in Postgres against `products.search_vector` and the trigram index (see
 * src/lib/search-schema.ts); there is no separate search engine to keep in sync.
 *
 *   1. Exact SKU or model number — someone pasting "GPG-6D" wants that product.
 *   2. Full-text, ranked by `ts_rank_cd` over the weighted document.
 *   3. Trigram fallback, only when full text found almost nothing, so that
 *      "makitta" still finds Makita.
 *
 * Returns product ids most relevant first. Filters, facets and paging are the
 * listing's job — search only decides which products are in scope and in what
 * order, which is why `/search` can reuse the category listing wholesale.
 */

/** Below this, the query probably has a typo and is worth a second look. */
const THIN_RESULTS = 3
const LIMIT = 200

/**
 * Synonym groups, cached per request. Small (tens of rows) and read on every
 * search, so it is worth not going back to the database for each one.
 */
const loadSynonyms = cache(async (payload: Payload): Promise<string[][]> => {
  const { docs } = await payload.find({
    collection: 'search-synonyms',
    where: { isActive: { equals: true } },
    pagination: false,
    depth: 0,
  })
  return docs
    .map((row) =>
      row.terms
        .split(',')
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean),
    )
    .filter((group) => group.length > 1)
})

/**
 * Rewrites "cordless drill" into "cordless drill OR battery drill" when staff
 * have said those words mean the same thing. Expansion happens here rather
 * than in Postgres because Neon does not allow custom thesaurus files.
 *
 * Only one group is applied — the query is a phrase, and OR-ing every
 * combination of every group turns a two-word search into a wall of noise.
 */
export const expandQuery = async (payload: Payload, query: string): Promise<string[]> => {
  const lower = query.toLowerCase()
  const groups = await loadSynonyms(payload)

  for (const group of groups) {
    const hit = group.find((term) => lower.includes(term))
    if (!hit) continue
    return [query, ...group.filter((term) => term !== hit).map((term) => lower.replace(hit, term))]
  }
  return [query]
}

type Ranked = { id: number }

const rowsOf = async (payload: Payload, statement: ReturnType<typeof sql>): Promise<number[]> => {
  const result = await payload.db.drizzle.execute(statement)
  const rows = (Array.isArray(result) ? result : (result.rows ?? [])) as Ranked[]
  return rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id))
}

/** "gpg - 6d" and "GPG6D" are the same code to a person, so they are here too. */
const normaliseCode = (query: string): string => query.toUpperCase().replace(/[^A-Z0-9]/g, '')

const bySku = async (payload: Payload, query: string): Promise<number[]> => {
  const code = normaliseCode(query)
  if (code.length < 3) return []
  return rowsOf(
    payload,
    sql`
      SELECT DISTINCT p.id
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      WHERE p.status = 'ACTIVE'
        AND (
          regexp_replace(upper(coalesce(v.sku, '')), '[^A-Z0-9]', '', 'g') = ${code}
          OR regexp_replace(upper(coalesce(p.model_number, '')), '[^A-Z0-9]', '', 'g') = ${code}
        )
      LIMIT ${LIMIT}
    `,
  )
}

const byFullText = async (payload: Payload, query: string): Promise<number[]> =>
  rowsOf(
    payload,
    sql`
      WITH q AS (
        SELECT websearch_to_tsquery('english', ${query}) || websearch_to_tsquery('simple', ${query}) AS query
      )
      SELECT p.id
      FROM products p, q
      WHERE p.status = 'ACTIVE' AND p.search_vector @@ q.query
      ORDER BY ts_rank_cd(p.search_vector, q.query) DESC, p.sort_order ASC NULLS LAST, p.id ASC
      LIMIT ${LIMIT}
    `,
  )

const byTrigram = async (payload: Payload, query: string): Promise<number[]> =>
  rowsOf(
    payload,
    sql`
      SELECT p.id
      FROM products p
      WHERE p.status = 'ACTIVE' AND ${query} <% p.search_a
      ORDER BY word_similarity(${query}, p.search_a) DESC, p.id ASC
      LIMIT ${LIMIT}
    `,
  )

export type Suggestion = { label: string; href: string; kind: 'product' | 'brand' | 'category' }

type SuggestionRow = { label: string; slug: string }

const suggestFrom = async (
  payload: Payload,
  table: 'products' | 'brands' | 'categories',
  query: string,
  limit: number,
): Promise<SuggestionRow[]> => {
  const prefix = `${query.toLowerCase()}%`
  const contains = `%${query.toLowerCase()}%`
  // Products carry the whole search document; brands and categories are just
  // names, and both tables are small enough to match on directly.
  const haystack = table === 'products' ? sql`p.search_a` : sql`p.name`
  const activeOnly = table === 'products' ? sql`p.status = 'ACTIVE'` : sql`p.is_active = true`

  // sql.raw is safe here only because `table` is a closed union declared in
  // this module; the query text never sees anything a shopper typed.
  const result = await payload.db.drizzle.execute(sql`
    SELECT p.name AS label, p.slug AS slug
    FROM ${sql.raw(table)} p
    WHERE ${activeOnly}
      AND (lower(${haystack}) LIKE ${contains} OR ${query} <% ${haystack})
    ORDER BY
      (lower(p.name) LIKE ${prefix}) DESC,
      word_similarity(${query}, ${haystack}) DESC,
      p.name ASC
    LIMIT ${limit}
  `)
  const rows = (Array.isArray(result) ? result : (result.rows ?? [])) as SuggestionRow[]
  return rows
}

/**
 * What the header offers while someone is still typing. Deliberately small and
 * cheap: a few products, then the brand and category they may have meant.
 */
export const suggestSearch = async (payload: Payload, rawQuery: string): Promise<Suggestion[]> => {
  const query = rawQuery.trim().slice(0, 60)
  if (query.length < 2) return []

  const [products, brands, categories] = await Promise.all([
    suggestFrom(payload, 'products', query, 6),
    suggestFrom(payload, 'brands', query, 3),
    suggestFrom(payload, 'categories', query, 3),
  ])

  return [
    ...products.map(({ label, slug }): Suggestion => ({ label, href: `/products/${slug}`, kind: 'product' })),
    // A brand has no page of its own yet, so it searches for itself.
    ...brands.map(({ label }): Suggestion => ({ label, href: `/search?q=${encodeURIComponent(label)}`, kind: 'brand' })),
    ...categories.map(({ label, slug }): Suggestion => ({ label, href: `/category/${slug}`, kind: 'category' })),
  ].slice(0, 10)
}

export type SearchOutcome = {
  /** Product ids, most relevant first. Empty means nothing matched. */
  ids: number[]
  /** True when the results came from the typo fallback, so the page can say so. */
  corrected: boolean
  /**
   * Set when the query was a product code that matched exactly one product and
   * nothing else. Someone pasting a SKU wants that product, not a list of one,
   * so the page sends them straight there.
   */
  exactId: number | null
}

export const searchProducts = async (payload: Payload, rawQuery: string): Promise<SearchOutcome> => {
  const query = rawQuery.trim().slice(0, 100)
  if (!query) return { ids: [], corrected: false, exactId: null }

  // Synonyms widen the full-text pass only: a SKU is a SKU, and the trigram
  // fallback is already forgiving about wording.
  const phrasings = await expandQuery(payload, query)
  const [skuHits, ...textPasses] = await Promise.all([
    bySku(payload, query),
    ...phrasings.map((phrasing) => byFullText(payload, phrasing)),
  ])

  // An exact code wins outright, but never hides the rest of the matches.
  const merged = [...new Set([...skuHits, ...textPasses.flat()])]
  // Only an unambiguous code jumps straight to the product: one SKU hit, and
  // no other product matched the words either.
  const exactId = skuHits.length === 1 && merged.length === 1 ? skuHits[0] : null

  if (merged.length > THIN_RESULTS) return { ids: merged, corrected: false, exactId }

  const fuzzy = await byTrigram(payload, query)
  const combined = [...new Set([...merged, ...fuzzy])]
  return { ids: combined, corrected: merged.length === 0 && fuzzy.length > 0, exactId }
}
