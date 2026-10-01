import { sql } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'
import { cache } from 'react'

import type { ProductCardProps } from '@/components/product/ProductCard'
import { CACHE_VERSION, STOREFRONT_CACHE } from '@/lib/revalidate'
import type { ListingParams, SortKey } from '@/lib/storefront/listing-params'
import { relId, toProductCards } from '@/lib/storefront/products'
import { getPayloadClient } from '@/lib/storefront/queries'
import type { Category, Product } from '@/payload-types'

export const PAGE_SIZE = 12

export type CategoryNode = Pick<Category, 'id' | 'name' | 'slug' | 'description'> & {
  parentId?: number
  bannerImage: Category['bannerImage']
}

/** Cached across requests; cleared by any catalogue save (see src/lib/revalidate.ts). */
const loadCategoryNodes = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'categories',
      where: { isActive: { equals: true } },
      sort: ['sortOrder', 'name'],
      pagination: false,
      depth: 1,
    })
    return docs.map<CategoryNode>((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      parentId: relId(doc.parent),
      bannerImage: doc.bannerImage,
    }))
  },
  ['category-tree', CACHE_VERSION],
  STOREFRONT_CACHE,
)

/** The whole active category tree. Small (tens of rows); the lookups are rebuilt per request. */
export const getCategoryTree = cache(async () => {
  const nodes = await loadCategoryNodes()
  const bySlug = new Map(nodes.map((node) => [node.slug, node]))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map<number, CategoryNode[]>()
  for (const node of nodes) {
    if (node.parentId === undefined) continue
    children.set(node.parentId, [...(children.get(node.parentId) ?? []), node])
  }

  const descendantIds = (id: number): number[] => [
    id,
    ...(children.get(id) ?? []).flatMap((child) => descendantIds(child.id)),
  ]

  return { bySlug, byId, children, descendantIds }
})

export type BrandFacet = { slug: string; name: string; count: number }
export type SpecFacet = { key: string; label: string; values: { value: string; count: number }[] }

export type Listing = {
  cards: ProductCardProps[]
  total: number
  page: number
  pageCount: number
  facets: {
    brands: BrandFacet[]
    specs: SpecFacet[]
    /** Rupee bounds of everything in scope, before the price filter, for the slider. */
    price: { min: number; max: number }
  }
}

const EMPTY_LISTING: Listing = {
  cards: [],
  total: 0,
  page: 1,
  pageCount: 1,
  facets: { brands: [], specs: [], price: { min: 0, max: 0 } },
}

/** One listable product, reduced to what filters, facets and sorting need. */
type IndexRow = {
  id: number
  sortOrder: number
  ratingAvg: number
  ratingCount: number
  createdAt: string
  brandId: number | null
  categoryId: number | null
  pricePaise: number
  inStock: boolean
  /** Filterable spec values by definition key. */
  specs: Record<string, string>
}

type CatalogueIndex = {
  rows: IndexRow[]
  brands: { id: number; name: string; slug: string }[]
  specDefs: { key: string; label: string }[]
}

/**
 * Every active, priced product in three queries of plain SQL. Going through
 * `payload.find` here meant building ~450 full documents per request, which
 * took a second or more; Postgres answers this in milliseconds.
 *
 * The price comes from the variant a card shows (default first, else the
 * first by sort order, as `pickVariant`), and a product is in stock when any
 * of its variants can be sold, as `loadPricing`. Products with no active
 * variant are left out: without a price they can't be bought.
 */
const loadCatalogueIndex = async (payload: Payload): Promise<CatalogueIndex> => {
  const db = payload.db.drizzle

  const [products, brands, specDefs] = await Promise.all([
    db.execute(sql`
      SELECT
        p.id, p.sort_order, p.rating_avg, p.rating_count, p.created_at, p.brand_id, p.category_id,
        v.selling_price_paise,
        EXISTS (
          SELECT 1 FROM inventory i
          WHERE i.product_id = p.id
            AND (i.allow_backorder IS TRUE OR COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0) > 0)
        ) AS in_stock,
        COALESCE((
          SELECT json_object_agg(
            d.key,
            COALESCE(NULLIF(sv.value_text, ''), CASE sv.value_bool WHEN TRUE THEN 'Yes' WHEN FALSE THEN 'No' END)
            ORDER BY sv._order
          )
          FROM products_spec_values sv
          JOIN spec_definitions d ON d.id = sv.definition_id
          WHERE sv._parent_id = p.id
            AND d.is_filter IS TRUE
            AND d.type <> 'NUMBER'
            AND (NULLIF(sv.value_text, '') IS NOT NULL OR sv.value_bool IS NOT NULL)
        ), '{}'::json) AS specs
      FROM products p
      JOIN LATERAL (
        SELECT pv.selling_price_paise
        FROM product_variants pv
        WHERE pv.product_id = p.id AND pv.is_active IS TRUE
        ORDER BY pv.is_default IS TRUE DESC, pv.sort_order ASC NULLS LAST, pv.id
        LIMIT 1
      ) v ON TRUE
      WHERE p.status = 'ACTIVE'
      -- Payload's default order, so sorts that tie keep the order they always had.
      ORDER BY p.created_at DESC
    `),
    db.execute(sql`SELECT id, name, slug FROM brands ORDER BY sort_order ASC NULLS LAST, name`),
    db.execute(sql`
      SELECT key, label FROM spec_definitions
      WHERE is_filter IS TRUE AND type <> 'NUMBER'
      ORDER BY sort_order ASC NULLS LAST
    `),
  ])

  const optionalId = (value: unknown) => (value === null || value === undefined ? null : Number(value))

  return {
    rows: products.rows.map((row) => ({
      id: Number(row.id),
      sortOrder: Number(row.sort_order ?? 0),
      ratingAvg: Number(row.rating_avg ?? 0),
      ratingCount: Number(row.rating_count ?? 0),
      createdAt: new Date(row.created_at as string).toISOString(),
      brandId: optionalId(row.brand_id),
      categoryId: optionalId(row.category_id),
      pricePaise: Number(row.selling_price_paise),
      inStock: Boolean(row.in_stock),
      specs: (row.specs ?? {}) as Record<string, string>,
    })),
    brands: brands.rows.map((row) => ({ id: Number(row.id), name: String(row.name), slug: String(row.slug) })),
    specDefs: specDefs.rows.map((row) => ({ key: String(row.key), label: String(row.label) })),
  }
}

/** Shared by every listing, search and filter combination until the catalogue changes. */
const getCatalogueIndex = cache(
  unstable_cache(
    async () => loadCatalogueIndex(await getPayloadClient()),
    ['catalogue-index', CACHE_VERSION],
    STOREFRONT_CACHE,
  ),
)

/** The cards for one page of results, in the order given. Cached per id list. */
const getCards = unstable_cache(
  async (ids: number[]): Promise<ProductCardProps[]> => {
    const payload = await getPayloadClient()
    const full = await payload.find({
      collection: 'products',
      where: { id: { in: ids } },
      pagination: false,
      depth: 1,
    })
    const byId = new Map(full.docs.map((doc) => [doc.id, doc]))
    return toProductCards(
      payload,
      ids.map((id) => byId.get(id)).filter((doc): doc is Product => Boolean(doc)),
    )
  },
  ['listing-cards', CACHE_VERSION],
  STOREFRONT_CACHE,
)

/**
 * The category / all-products / search listing. Filters, facet counts and
 * sorting run in memory over the cached catalogue index, then only the
 * requested page is turned into cards. That is plenty for a catalogue of a
 * few thousand products.
 */
export const getListing = async (options: {
  categoryIds: number[] | null
  params: ListingParams
  productIds?: number[] | null
}): Promise<Listing> => {
  const { categoryIds, params, productIds = null } = options
  // Search hands us the matching ids already ranked; an empty array means the
  // query matched nothing, which is not the same as "no id filter".
  if (productIds?.length === 0) return EMPTY_LISTING

  const index = await getCatalogueIndex()
  const inCategories = categoryIds ? new Set(categoryIds) : null
  const inIds = productIds ? new Set(productIds) : null
  const priced = index.rows.filter(
    (row) =>
      (!inCategories || (row.categoryId !== null && inCategories.has(row.categoryId))) &&
      (!inIds || inIds.has(row.id)),
  )

  const brandSlugById = new Map(index.brands.map((brand) => [brand.id, brand.slug]))

  const minPaise = params.minRupees !== undefined ? params.minRupees * 100 : undefined
  const maxPaise = params.maxRupees !== undefined ? params.maxRupees * 100 : undefined

  // Each test is named so facet counts can skip their own filter: the brand
  // list shows how many you'd get by ticking that brand, given everything else.
  const tests = {
    brand: (row: IndexRow) =>
      params.brands.length === 0 || params.brands.includes(brandSlugById.get(row.brandId ?? -1) ?? ''),
    price: (row: IndexRow) =>
      (minPaise === undefined || row.pricePaise >= minPaise) && (maxPaise === undefined || row.pricePaise <= maxPaise),
    stock: (row: IndexRow) => !params.inStock || row.inStock,
    specs: (row: IndexRow) =>
      Object.entries(params.specs).every(([key, values]) => values.includes(row.specs[key] ?? '')),
  }
  type TestName = keyof typeof tests
  const passes = (row: IndexRow, skip?: TestName) =>
    (Object.keys(tests) as TestName[]).every((name) => name === skip || tests[name](row))

  const matched = priced.filter((row) => passes(row))

  const brandsInScope = new Set(priced.map((row) => row.brandId))
  const brands: BrandFacet[] = index.brands
    .filter((brand) => brandsInScope.has(brand.id))
    .map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      count: priced.filter((row) => row.brandId === brand.id && passes(row, 'brand')).length,
    }))
    .filter((brand) => brand.count > 0 || params.brands.includes(brand.slug))

  const specs: SpecFacet[] = index.specDefs.flatMap((def) => {
    const counts = new Map<string, number>()
    for (const row of priced) {
      const value = row.specs[def.key]
      if (value && passes(row, 'specs')) counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    if (counts.size === 0) return []
    return [
      {
        key: def.key,
        label: def.label,
        values: [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value)),
      },
    ]
  })

  const prices = priced.map((row) => row.pricePaise)
  const price = {
    min: prices.length ? Math.floor(Math.min(...prices) / 100) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices) / 100) : 0,
  }

  const bySortOrder = (a: IndexRow, b: IndexRow) => a.sortOrder - b.sortOrder
  // `productIds` arrives ranked; relevance just keeps that order.
  const rankOf = new Map(productIds?.map((id, position) => [id, position]))
  const comparators: Record<SortKey, (a: IndexRow, b: IndexRow) => number> = {
    relevance: (a, b) =>
      (rankOf.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rankOf.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    popularity: (a, b) => b.ratingCount - a.ratingCount || bySortOrder(a, b),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    'price-asc': (a, b) => a.pricePaise - b.pricePaise,
    'price-desc': (a, b) => b.pricePaise - a.pricePaise,
    rating: (a, b) => b.ratingAvg - a.ratingAvg || bySortOrder(a, b),
  }
  matched.sort(comparators[params.sort])

  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  const pageIds = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => row.id)
  const cards = pageIds.length ? await getCards(pageIds) : []

  return { cards, total: matched.length, page, pageCount, facets: { brands, specs, price } }
}
