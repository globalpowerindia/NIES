import type { ListViewServerProps } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'
import { loadUnpublishedDrafts } from '@/lib/product-drafts'
import { isPriced, loadProductStock, type ProductStock } from '@/lib/product-stock'

// `draft` is the URL key from before Hidden was renamed; links to it keep working.
const VIEWS: Record<string, string> = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  archived: 'ARCHIVED',
}

/** Sold online or enquiry-only (WhatsApp), the `sellOnline` checkbox. */
const SALE_VIEWS: Record<string, boolean> = { online: true, enquiry: false }

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  DRAFT: { label: 'Hidden', tone: 'warning' },
  ARCHIVED: { label: 'Archived', tone: 'muted' },
}

const nameOf = (value: unknown): string | undefined =>
  value && typeof value === 'object' && 'name' in value ? String((value as { name: string }).name) : undefined

const thumbOf = (images: unknown): string | null => {
  if (!Array.isArray(images) || images.length === 0) return null
  const first = images[0]
  if (first && typeof first === 'object' && 'url' in first) {
    const url = (first as { url?: string | null }).url
    return url ?? null
  }
  return null
}

/** Views decided by price and stock rather than a stored field. */
const STOCK_VIEWS: Record<string, (stock: ProductStock) => boolean> = {
  noprice: (stock) => !isPriced(stock),
  out: (stock) => isPriced(stock) && stock.level === 'OUT_OF_STOCK',
  low: (stock) => isPriced(stock) && stock.level === 'LOW_STOCK',
}

const LEVEL: Record<ProductStock['level'], { label: string; tone: Tone }> = {
  IN_STOCK: { label: 'In stock', tone: 'success' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
}

export const ProductsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  // Price and stock for every product: one query, and what the stock views filter on.
  const [allStock, unpublished] = await Promise.all([loadProductStock(payload), loadUnpublishedDrafts(payload.db.drizzle)])
  const idsWhere = (test: (stock: ProductStock) => boolean) => ({
    id: { in: [...allStock].filter(([, stock]) => test(stock)).map(([id]) => id).concat(-1) },
  })
  const countOf = (test: (stock: ProductStock) => boolean) => [...allStock.values()].filter(test).length

  const where = combineWhere(
    view === 'unpublished'
      ? { id: { in: [...unpublished, -1] } }
      : VIEWS[view]
      ? { status: { equals: VIEWS[view] } }
      : STOCK_VIEWS[view]
        ? idsWhere(STOCK_VIEWS[view])
        : view in SALE_VIEWS
          ? SALE_VIEWS[view]
            ? { sellOnline: { equals: true } }
            : { sellOnline: { not_equals: true } }
          : undefined,
    searchWhere(q, ['name', 'slug', 'hsnCode']),
  )

  const [result, active, draft, archived, variants, online] = await Promise.all([
    payload.find({ collection: 'products', where, limit, page, sort: '-updatedAt', depth: 1 }),
    payload.count({ collection: 'products', where: { status: { equals: 'ACTIVE' } } }),
    payload.count({ collection: 'products', where: { status: { equals: 'DRAFT' } } }),
    payload.count({ collection: 'products', where: { status: { equals: 'ARCHIVED' } } }),
    payload.count({ collection: 'product-variants' }),
    payload.count({ collection: 'products', where: { sellOnline: { equals: true } } }),
  ])
  const total = active.totalDocs + draft.totalDocs + archived.totalDocs

  const rows: ListRow[] = result.docs.map((product) => {
    const status = STATUS[product.status] ?? STATUS.DRAFT
    const stock = allStock.get(product.id)
    const level = stock ? LEVEL[stock.level] : LEVEL.OUT_OF_STOCK
    return {
      id: String(product.id),
      href: `/admin/collections/products/${product.id}`,
      cells: [
        {
          t: 'thumb',
          src: thumbOf(product.images),
          alt: product.name,
          v: product.name,
          sub: product.slug,
        },
        { t: 'text', v: nameOf(product.brand) ?? '—' },
        { t: 'text', v: nameOf(product.category) ?? '—' },
        isPriced(stock) ? { t: 'money', v: stock!.pricePaise! } : { t: 'pill', v: 'No price', tone: 'danger' },
        isPriced(stock)
          ? {
              t: 'pills',
              items: [
                { v: stock!.backorder && stock!.available <= 0 ? 'Backorder' : level.label, tone: level.tone },
                { v: `${Math.max(0, stock!.available)} avail.`, tone: 'neutral' },
              ],
            }
          : { t: 'empty' },
        { t: 'text', v: product.hsnCode, sub: `${(product.gstRateBps / 100).toFixed(0)}% GST` },
        {
          t: 'pills',
          items: [
            { v: status.label, tone: status.tone },
            ...(unpublished.has(product.id) ? [{ v: 'Unpublished changes', tone: 'accent' as Tone }] : []),
            product.sellOnline ? { v: 'Sold online', tone: 'success' } : { v: 'Enquiry only', tone: 'neutral' },
          ],
        },
        { t: 'date', v: product.updatedAt },
      ],
    }
  })

  return (
    <DataList
      title="Products"
      basePath="/admin/collections/products"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Name, slug, HSN"
      createHref="/admin/collections/products/create"
      createLabel="New product"
      kpis={[
        { label: 'Active', value: active.totalDocs },
        { label: 'Hidden', value: draft.totalDocs },
        { label: 'Archived', value: archived.totalDocs },
        { label: 'Variants', value: variants.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All products' },
        { key: 'active', label: 'Active', count: active.totalDocs },
        { key: 'draft', label: 'Hidden', count: draft.totalDocs },
        { key: 'archived', label: 'Archived', count: archived.totalDocs },
        { key: 'unpublished', label: 'Unpublished changes', count: unpublished.size },
        { key: 'noprice', label: 'No price', count: countOf(STOCK_VIEWS.noprice) },
        { key: 'out', label: 'Out of stock', count: countOf(STOCK_VIEWS.out) },
        { key: 'low', label: 'Low stock', count: countOf(STOCK_VIEWS.low) },
        { key: 'online', label: 'Sold online', count: online.totalDocs },
        { key: 'enquiry', label: 'Enquiry only', count: total - online.totalDocs },
      ]}
      columns={[
        { header: 'Product' },
        { header: 'Brand', width: 130 },
        { header: 'Category', width: 150 },
        { header: 'Price', align: 'right', width: 110 },
        { header: 'Stock', width: 190 },
        { header: 'Tax', width: 110 },
        { header: 'Status', width: 240 },
        { header: 'Updated', width: 140 },
      ]}
      rows={rows}
      emptyMessage="No products match this view."
    />
  )
}

export default ProductsList
