import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { Cell, ListRow } from '@/admin/components/list/types'

const VIEWS: Record<string, Where> = {
  active: { isActive: { equals: true } },
  inactive: { isActive: { equals: false } },
  cordless: { powerSource: { equals: 'CORDLESS' } },
  kits: { packType: { equals: 'KIT' } },
}

const nameOf = (value: unknown): string =>
  value && typeof value === 'object' && 'name' in value
    ? String((value as { name: string }).name)
    : '—'

export const VariantsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  const where = combineWhere(VIEWS[view], searchWhere(q, ['sku', 'name', 'barcode']))

  const [result, active, cordless, kits] = await Promise.all([
    payload.find({ collection: 'product-variants', where, limit, page, sort: 'sku', depth: 1 }),
    payload.count({ collection: 'product-variants', where: { isActive: { equals: true } } }),
    payload.count({ collection: 'product-variants', where: { powerSource: { equals: 'CORDLESS' } } }),
    payload.count({ collection: 'product-variants', where: { packType: { equals: 'KIT' } } }),
  ])

  const rows: ListRow[] = result.docs.map((variant) => {
    const tags: Cell = {
      t: 'pills',
      items: [
        ...(variant.powerSource
          ? [{ v: variant.powerSource === 'CORDLESS' ? 'Cordless' : 'Corded', tone: 'brand' as const }]
          : []),
        ...(variant.packType
          ? [{ v: variant.packType === 'KIT' ? 'Kit' : 'Bare tool', tone: 'neutral' as const }]
          : []),
        ...(variant.batteryAh
          ? [{ v: `${(variant.batteryAh / 10).toFixed(1)}Ah`, tone: 'accent' as const }]
          : []),
      ],
    }
    const discount =
      variant.mrpPaise > variant.sellingPricePaise
        ? Math.round(((variant.mrpPaise - variant.sellingPricePaise) / variant.mrpPaise) * 100)
        : 0

    return {
      id: String(variant.id),
      href: `/admin/collections/product-variants/${variant.id}`,
      cells: [
        {
          t: 'link',
          v: variant.sku,
          href: `/admin/collections/product-variants/${variant.id}`,
          sub: variant.name,
        },
        { t: 'text', v: nameOf(variant.product) },
        tags,
        { t: 'money', v: variant.mrpPaise, strike: discount > 0 },
        { t: 'money', v: variant.sellingPricePaise },
        discount > 0
          ? { t: 'pill', v: `${discount}% off`, tone: 'accent' }
          : { t: 'empty' },
        { t: 'bool', v: variant.isActive ?? true, on: 'Active', off: 'Inactive' },
      ],
    }
  })

  return (
    <DataList
      title="Variants"
      basePath="/admin/collections/product-variants"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="SKU, name, barcode"
      createHref="/admin/collections/product-variants/create"
      createLabel="New variant"
      kpis={[
        { label: 'Total variants', value: result.totalDocs },
        { label: 'Active', value: active.totalDocs },
        { label: 'Cordless', value: cordless.totalDocs },
        { label: 'Kits', value: kits.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All variants' },
        { key: 'active', label: 'Active', count: active.totalDocs },
        { key: 'inactive', label: 'Inactive' },
        { key: 'cordless', label: 'Cordless', count: cordless.totalDocs },
        { key: 'kits', label: 'Kits', count: kits.totalDocs },
      ]}
      columns={[
        { header: 'SKU' },
        { header: 'Product' },
        { header: 'Configuration', width: 220 },
        { header: 'MRP', align: 'right', width: 110 },
        { header: 'Selling', align: 'right', width: 110 },
        { header: 'Saving', width: 100 },
        { header: 'State', width: 100 },
      ]}
      rows={rows}
      emptyMessage="No variants match this view."
    />
  )
}

export default VariantsList
