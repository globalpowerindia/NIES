import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow } from '@/admin/components/list/types'

const VIEWS: Record<string, Where> = {
  active: { isActive: { equals: true } },
  inactive: { isActive: { equals: false } },
}

const imageUrl = (value: unknown): string | null =>
  value && typeof value === 'object' && 'url' in value
    ? ((value as { url?: string | null }).url ?? null)
    : null

export const BrandsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)
  const where = combineWhere(VIEWS[view], searchWhere(q, ['name', 'slug']))

  const [result, active] = await Promise.all([
    payload.find({ collection: 'brands', where, limit, page, sort: 'sortOrder', depth: 1 }),
    payload.count({ collection: 'brands', where: { isActive: { equals: true } } }),
  ])

  const counts = await Promise.all(
    result.docs.map((brand) =>
      payload.count({ collection: 'products', where: { brand: { equals: brand.id } } }),
    ),
  )

  const rows: ListRow[] = result.docs.map((brand, index) => ({
    id: String(brand.id),
    href: `/admin/collections/brands/${brand.id}`,
    cells: [
      { t: 'thumb', src: imageUrl(brand.logo), alt: brand.name, v: brand.name, sub: brand.slug },
      { t: 'num', v: counts[index]!.totalDocs, suffix: 'products' },
      { t: 'num', v: brand.sortOrder ?? 0 },
      { t: 'bool', v: brand.isActive ?? true, on: 'Visible', off: 'Hidden' },
      { t: 'date', v: brand.updatedAt },
    ],
  }))

  return (
    <DataList
      title="Brands"
      basePath="/admin/collections/brands"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Brand name"
      createHref="/admin/collections/brands/create"
      createLabel="New brand"
      kpis={[
        { label: 'All brands', value: result.totalDocs },
        { label: 'Visible', value: active.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All' },
        { key: 'active', label: 'Visible', count: active.totalDocs },
        { key: 'inactive', label: 'Hidden' },
      ]}
      columns={[
        { header: 'Brand' },
        { header: 'Catalogue', align: 'right', width: 140 },
        { header: 'Order', align: 'right', width: 90 },
        { header: 'Storefront', width: 120 },
        { header: 'Updated', width: 140 },
      ]}
      rows={rows}
      emptyMessage="No brands match this view."
    />
  )
}

export default BrandsList
