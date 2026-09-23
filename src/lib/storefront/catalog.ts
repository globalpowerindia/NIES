import type { Payload, Where } from 'payload'
import { cache } from 'react'

import type { ProductCardProps } from '@/components/product/ProductCard'
import type { ListingParams, SortKey } from '@/lib/storefront/listing-params'
import { loadPricing, relId, toProductCards } from '@/lib/storefront/products'
import { getPayloadClient } from '@/lib/storefront/queries'
import type { Category, Product } from '@/payload-types'

export const PAGE_SIZE = 12

export type CategoryNode = Pick<Category, 'id' | 'name' | 'slug' | 'description'> & {
  parentId?: number
  bannerImage: Category['bannerImage']
}

/** The whole active category tree. Small (tens of rows), so one query per request. */
export const getCategoryTree = cache(async () => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'categories',
    where: { isActive: { equals: true } },
    sort: ['sortOrder', 'name'],
    pagination: false,
    depth: 1,
  })

  const nodes = docs.map<CategoryNode>((doc) => ({
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    parentId: relId(doc.parent),
    bannerImage: doc.bannerImage,
  }))
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

type ListingRow = Pick<Product, 'id' | 'sortOrder' | 'ratingAvg' | 'ratingCount' | 'createdAt' | 'specValues'> & {
  brand?: number | null
  category?: number | null
}

const specText = (entry: NonNullable<Product['specValues']>[number]): string | null => {
  if (entry.valueText) return entry.valueText
  if (typeof entry.valueBool === 'boolean') return entry.valueBool ? 'Yes' : 'No'
  return null
}

/**
 * The category / all-products listing. Filters, facet counts and sorting run
 * over lightweight rows in memory, then only the requested page is loaded in
 * full. That is plenty for a catalogue of a few thousand products; the plan's
 * Postgres search work replaces the in-memory step when it lands.
 */
export const getListing = async (
  payload: Payload,
  options: { categoryIds: number[] | null; params: ListingParams },
): Promise<Listing> => {
  const { categoryIds, params } = options
  const scope: Where[] = [{ status: { equals: 'ACTIVE' } }]
  if (categoryIds) scope.push({ category: { in: categoryIds } })

  const { docs } = await payload.find({
    collection: 'products',
    where: { and: scope },
    pagination: false,
    depth: 0,
    select: {
      sortOrder: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      specValues: true,
      brand: true,
      category: true,
    },
  })
  const rows = docs as unknown as ListingRow[]

  const [pricing, brandDocs, specDefs] = await Promise.all([
    loadPricing(
      payload,
      rows.map((row) => row.id),
    ),
    payload.find({
      collection: 'brands',
      where: { id: { in: [...new Set(rows.map((row) => relId(row.brand)).filter(Boolean))] } },
      pagination: false,
      depth: 0,
      select: { name: true, slug: true, sortOrder: true },
      sort: ['sortOrder', 'name'],
    }),
    payload.find({
      collection: 'spec-definitions',
      where: { and: [{ isFilter: { equals: true } }, { type: { not_equals: 'NUMBER' } }] },
      pagination: false,
      depth: 0,
      sort: 'sortOrder',
    }),
  ])

  const brandSlugById = new Map(brandDocs.docs.map((brand) => [brand.id, brand.slug]))
  const specKeyById = new Map(specDefs.docs.map((def) => [def.id, def.key]))

  // Only products with a price can be listed at all.
  const priced = rows.filter((row) => pricing.has(row.id))

  const specsOf = (row: ListingRow): Map<string, string> => {
    const out = new Map<string, string>()
    for (const entry of row.specValues ?? []) {
      const key = specKeyById.get(relId(entry.definition) ?? -1)
      const text = specText(entry)
      if (key && text) out.set(key, text)
    }
    return out
  }

  const minPaise = params.minRupees !== undefined ? params.minRupees * 100 : undefined
  const maxPaise = params.maxRupees !== undefined ? params.maxRupees * 100 : undefined

  // Each test is named so facet counts can skip their own filter: the brand
  // list shows how many you'd get by ticking that brand, given everything else.
  const tests = {
    brand: (row: ListingRow) =>
      params.brands.length === 0 || params.brands.includes(brandSlugById.get(relId(row.brand) ?? -1) ?? ''),
    price: (row: ListingRow) => {
      const price = pricing.get(row.id)!.variant.sellingPricePaise
      return (minPaise === undefined || price >= minPaise) && (maxPaise === undefined || price <= maxPaise)
    },
    stock: (row: ListingRow) => !params.inStock || pricing.get(row.id)!.inStock,
    specs: (row: ListingRow) => {
      const specs = specsOf(row)
      return Object.entries(params.specs).every(([key, values]) => values.includes(specs.get(key) ?? ''))
    },
  }
  type TestName = keyof typeof tests
  const passes = (row: ListingRow, skip?: TestName) =>
    (Object.keys(tests) as TestName[]).every((name) => name === skip || tests[name](row))

  const matched = priced.filter((row) => passes(row))

  const brands: BrandFacet[] = brandDocs.docs
    .map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      count: priced.filter((row) => relId(row.brand) === brand.id && passes(row, 'brand')).length,
    }))
    .filter((brand) => brand.count > 0 || params.brands.includes(brand.slug))

  const specs: SpecFacet[] = specDefs.docs.flatMap((def) => {
    const counts = new Map<string, number>()
    for (const row of priced) {
      const value = specsOf(row).get(def.key)
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

  const prices = priced.map((row) => pricing.get(row.id)!.variant.sellingPricePaise)
  const price = {
    min: prices.length ? Math.floor(Math.min(...prices) / 100) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices) / 100) : 0,
  }

  const priceOf = (row: ListingRow) => pricing.get(row.id)!.variant.sellingPricePaise
  const bySortOrder = (a: ListingRow, b: ListingRow) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
  const comparators: Record<SortKey, (a: ListingRow, b: ListingRow) => number> = {
    popularity: (a, b) => Number(b.ratingCount ?? 0) - Number(a.ratingCount ?? 0) || bySortOrder(a, b),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    'price-asc': (a, b) => priceOf(a) - priceOf(b),
    'price-desc': (a, b) => priceOf(b) - priceOf(a),
    rating: (a, b) => Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0) || bySortOrder(a, b),
  }
  matched.sort(comparators[params.sort])

  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  const pageIds = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => row.id)

  let cards: ProductCardProps[] = []
  if (pageIds.length) {
    const full = await payload.find({
      collection: 'products',
      where: { id: { in: pageIds } },
      pagination: false,
      depth: 1,
    })
    const byId = new Map(full.docs.map((doc) => [doc.id, doc]))
    cards = await toProductCards(
      payload,
      pageIds.map((id) => byId.get(id)).filter((doc): doc is Product => Boolean(doc)),
    )
  }

  return { cards, total: matched.length, page, pageCount, facets: { brands, specs, price } }
}
