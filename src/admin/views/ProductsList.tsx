import type { ListViewServerProps, Payload } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { PRODUCT_STOCK_VIEWS as STOCK_VIEWS, productsWhere } from '@/admin/components/list/filters'
import { readListParams } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'
import { loadProductActivity, type ProductActivity } from '@/lib/product-demand'
import { loadUnpublishedDrafts } from '@/lib/product-drafts'
import { isPriced, loadProductStock, type ProductStock } from '@/lib/product-stock'

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

const LEVEL: Record<ProductStock['level'], { label: string; tone: Tone }> = {
  IN_STOCK: { label: 'In stock', tone: 'success' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
}

const countFmt = new Intl.NumberFormat('en-IN')

/** Extra columns: failing to read them must not take away the list staff work from. */
const readActivity = async (payload: Payload, ids: number[]) => {
  try {
    return await loadProductActivity(payload, ids)
  } catch (err) {
    payload.logger.error({ err }, 'Could not load product activity')
    return new Map<number, ProductActivity>()
  }
}

export const ProductsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  // Price and stock for every product: one query, and what the stock views filter on.
  const [allStock, unpublished] = await Promise.all([loadProductStock(payload), loadUnpublishedDrafts(payload.db.drizzle)])
  const countOf = (test: (stock: ProductStock) => boolean) => [...allStock.values()].filter(test).length

  const where = productsWhere(view, q, allStock, unpublished)

  const [result, active, draft, archived, variants, online] = await Promise.all([
    payload.find({ collection: 'products', where, limit, page, sort: '-updatedAt', depth: 1 }),
    payload.count({ collection: 'products', where: { status: { equals: 'ACTIVE' } } }),
    payload.count({ collection: 'products', where: { status: { equals: 'DRAFT' } } }),
    payload.count({ collection: 'products', where: { status: { equals: 'ARCHIVED' } } }),
    payload.count({ collection: 'product-variants' }),
    payload.count({ collection: 'products', where: { sellOnline: { equals: true } } }),
  ])
  const total = active.totalDocs + draft.totalDocs + archived.totalDocs
  const activity = await readActivity(payload, result.docs.map((product) => product.id))

  const rows: ListRow[] = result.docs.map((product) => {
    const status = STATUS[product.status] ?? STATUS.DRAFT
    const stock = allStock.get(product.id)
    const level = stock ? LEVEL[stock.level] : LEVEL.OUT_OF_STOCK
    const counts = activity.get(product.id)
    const pastUnits = product.pastUnitsSold ?? 0
    return {
      id: String(product.id),
      href: `/admin/collections/products/${product.id}`,
      cells: [
        // The slug is left out: search still finds it, and it doubled the row's height.
        { t: 'thumb', src: thumbOf(product.images), alt: product.name, v: product.name },
        { t: 'text', v: nameOf(product.category) ?? '—', sub: nameOf(product.brand) },
        isPriced(stock) ? { t: 'money', v: stock!.pricePaise! } : { t: 'pill', v: 'No price', tone: 'danger' },
        isPriced(stock)
          ? {
              t: 'pill',
              v: stock!.backorder && stock!.available <= 0
                ? 'Backorder'
                : `${level.label} · ${countFmt.format(Math.max(0, stock!.available))}`,
              tone: level.tone,
            }
          : { t: 'empty' },
        {
          t: 'text',
          v: `${countFmt.format(counts?.views7Days ?? 0)} ${counts?.views7Days === 1 ? 'view' : 'views'} · ${countFmt.format(counts?.sold30Days ?? 0)} sold`,
          sub: `${countFmt.format(counts?.views30Days ?? 0)} views in 30 days · ${countFmt.format((counts?.soldAllTime ?? 0) + pastUnits)} sold all time${pastUnits ? ` (${countFmt.format(pastUnits)} past)` : ''}`,
        },
        { t: 'text', v: `${product.hsnCode} · ${(product.gstRateBps / 100).toFixed(0)}%` },
        {
          t: 'pills',
          items: [
            { v: status.label, tone: status.tone },
            ...(unpublished.has(product.id) ? [{ v: 'Unpublished changes', tone: 'accent' as Tone }] : []),
            // Enquiry only is nearly every product, so only the exception gets a badge.
            ...(product.sellOnline ? [{ v: 'Sold online', tone: 'success' as Tone }] : []),
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
      exportHref="/api/products/list-export"
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
        // No fixed widths: cells are one line now, so columns size to what they hold.
        { header: 'Product' },
        { header: 'Category · Brand' },
        { header: 'Price', align: 'right' },
        { header: 'Stock' },
        { header: 'Views 7d · Sold 30d' },
        { header: 'HSN · GST' },
        { header: 'Status' },
        { header: 'Updated' },
      ]}
      rows={rows}
      emptyMessage="No products match this view."
    />
  )
}

export default ProductsList
