import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'
import { MOVEMENT_TYPES, type MovementType } from '@/lib/inventory'

const byTypes = (types: MovementType[]): Where => ({ type: { in: types } })

const VIEWS: Record<string, Where> = {
  in: byTypes(['RECEIVED', 'RETURNED', 'ADJUST_UP']),
  out: byTypes(['ADJUST_DOWN', 'DAMAGED']),
  orders: byTypes(['RESERVED', 'RELEASED', 'SOLD']),
}

const toneOf = (type: MovementType): Tone => {
  const rule = MOVEMENT_TYPES[type]
  if (rule.system) return 'brand'
  return rule.onHand > 0 ? 'success' : 'danger'
}

const nameOf = (value: unknown, key: string): string =>
  value && typeof value === 'object' && key in value ? String((value as Record<string, unknown>)[key]) : '—'

export const StockMovementsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  const search: Where | undefined = q
    ? { or: [{ 'variant.sku': { like: q } }, { note: { like: q } }] }
    : undefined

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [result, received, removed, lastWeek] = await Promise.all([
    payload.find({
      collection: 'stock-movements',
      where: combineWhere(VIEWS[view], search),
      limit,
      page,
      sort: '-createdAt',
      depth: 1,
    }),
    payload.count({ collection: 'stock-movements', where: VIEWS.in }),
    payload.count({ collection: 'stock-movements', where: VIEWS.out }),
    payload.count({ collection: 'stock-movements', where: { createdAt: { greater_than: since } } }),
  ])

  const rows: ListRow[] = result.docs.map((move) => {
    const type = move.type as MovementType
    const rule = MOVEMENT_TYPES[type]
    const delta = rule.onHand !== 0 ? rule.onHand : rule.reserved
    return {
      id: String(move.id),
      href: `/admin/collections/stock-movements/${move.id}`,
      cells: [
        { t: 'date', v: move.createdAt },
        { t: 'text', v: nameOf(move.variant, 'sku'), sub: nameOf(move.variant, 'name') },
        { t: 'pill', v: rule.label, tone: toneOf(type) },
        { t: 'text', v: `${delta > 0 ? '+' : '−'}${move.quantity}` },
        typeof move.onHandAfter === 'number' ? { t: 'num', v: move.onHandAfter } : { t: 'empty' },
        move.note ? { t: 'text', v: move.note } : { t: 'empty' },
        { t: 'text', v: move.recordedBy ? nameOf(move.recordedBy, 'name') : 'System' },
      ],
    }
  })

  return (
    <DataList
      title="Stock movements"
      basePath="/admin/collections/stock-movements"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="SKU or note"
      createHref="/admin/collections/stock-movements/create"
      createLabel="Record movement"
      kpis={[
        { label: 'Movements', value: result.totalDocs },
        { label: 'Last 7 days', value: lastWeek.totalDocs },
        { label: 'Stock in', value: received.totalDocs, tone: 'success' },
        { label: 'Stock out', value: removed.totalDocs, tone: removed.totalDocs ? 'danger' : undefined },
      ]}
      filters={[
        { key: 'all', label: 'All movements' },
        { key: 'in', label: 'Stock in', count: received.totalDocs },
        { key: 'out', label: 'Stock out', count: removed.totalDocs },
        { key: 'orders', label: 'From orders' },
      ]}
      columns={[
        { header: 'When', width: 150 },
        { header: 'SKU' },
        { header: 'Type', width: 200 },
        { header: 'Qty', align: 'right', width: 70 },
        { header: 'On hand after', align: 'right', width: 120 },
        { header: 'Note', hideBelow: 'md' },
        { header: 'By', width: 160, hideBelow: 'md' },
      ]}
      rows={rows}
      emptyMessage="No stock movements recorded yet."
    />
  )
}

export default StockMovementsList
