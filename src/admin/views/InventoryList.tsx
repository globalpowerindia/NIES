import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'

const VIEWS: Record<string, Where> = {
  low: { stockStatus: { equals: 'LOW_STOCK' } },
  out: { stockStatus: { equals: 'OUT_OF_STOCK' } },
  reserved: { reserved: { greater_than: 0 } },
  backorder: { allowBackorder: { equals: true } },
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  IN_STOCK: { label: 'In stock', tone: 'success' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
}

const nameOf = (value: unknown, key = 'name'): string =>
  value && typeof value === 'object' && key in value ? String((value as Record<string, unknown>)[key]) : '—'

export const InventoryList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  const where = combineWhere(VIEWS[view], searchWhere(q, ['sku', 'product.name']))

  // Worst first: out of stock, then low, then fine — the order staff act on.
  const [result, low, out, reserved, all] = await Promise.all([
    payload.find({ collection: 'inventory', where, limit, page, sort: ['stockStatus', 'sku'], depth: 1 }),
    payload.count({ collection: 'inventory', where: VIEWS.low }),
    payload.count({ collection: 'inventory', where: VIEWS.out }),
    payload.count({ collection: 'inventory', where: VIEWS.reserved }),
    payload.find({ collection: 'inventory', pagination: false, depth: 0, select: { onHand: true } }),
  ])

  const unitsOnHand = all.docs.reduce((sum, doc) => sum + Number(doc.onHand ?? 0), 0)

  const rows: ListRow[] = result.docs.map((stock) => {
    const status = STATUS[stock.stockStatus ?? 'OUT_OF_STOCK']
    const available = Number(stock.onHand ?? 0) - Number(stock.reserved ?? 0)
    const href = `/admin/collections/inventory/${stock.id}`
    return {
      id: String(stock.id),
      href,
      cells: [
        { t: 'link', v: stock.sku ?? '—', href, sub: nameOf(stock.variant) },
        { t: 'text', v: nameOf(stock.product) },
        { t: 'num', v: Number(stock.onHand ?? 0) },
        stock.reserved ? { t: 'num', v: Number(stock.reserved) } : { t: 'empty' },
        { t: 'num', v: available },
        { t: 'pill', v: status.label, tone: status.tone },
        { t: 'num', v: Number(stock.lowStockThreshold ?? 0) },
        { t: 'bool', v: Boolean(stock.allowBackorder), on: 'Backorder', off: '—' },
      ],
    }
  })

  return (
    <DataList
      title="Stock levels"
      basePath="/admin/collections/inventory"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="SKU or product"
      kpis={[
        { label: 'SKUs tracked', value: all.docs.length },
        { label: 'Units on hand', value: unitsOnHand.toLocaleString('en-IN') },
        { label: 'Low stock', value: low.totalDocs, tone: low.totalDocs ? 'warning' : undefined },
        { label: 'Out of stock', value: out.totalDocs, tone: out.totalDocs ? 'danger' : undefined },
      ]}
      filters={[
        { key: 'all', label: 'All stock' },
        { key: 'low', label: 'Low stock', count: low.totalDocs },
        { key: 'out', label: 'Out of stock', count: out.totalDocs },
        { key: 'reserved', label: 'Held for orders', count: reserved.totalDocs },
        { key: 'backorder', label: 'Backorder allowed' },
      ]}
      columns={[
        { header: 'SKU' },
        { header: 'Product' },
        { header: 'On hand', align: 'right', width: 90 },
        { header: 'Held', align: 'right', width: 80 },
        { header: 'Available', align: 'right', width: 100 },
        { header: 'Status', width: 120 },
        { header: 'Alert at', align: 'right', width: 90, hideBelow: 'md' },
        { header: 'Backorder', width: 100, hideBelow: 'md' },
      ]}
      rows={rows}
      emptyMessage="No stock rows yet. They appear when a variant is created."
    />
  )
}

export default InventoryList
