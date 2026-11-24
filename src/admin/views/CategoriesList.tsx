import type { ListViewServerProps } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { categoriesWhere } from '@/admin/components/list/filters'
import { readListParams } from '@/admin/components/list/params'
import type { ListRow } from '@/admin/components/list/types'

const imageUrl = (value: unknown): string | null =>
  value && typeof value === 'object' && 'url' in value
    ? ((value as { url?: string | null }).url ?? null)
    : null

const nameOf = (value: unknown): string | undefined =>
  value && typeof value === 'object' && 'name' in value
    ? String((value as { name: string }).name)
    : undefined

export const CategoriesList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)
  const where = categoriesWhere(view, q)

  const [result, top, sub] = await Promise.all([
    payload.find({ collection: 'categories', where, limit, page, sort: 'sortOrder', depth: 1 }),
    payload.count({ collection: 'categories', where: { parent: { exists: false } } }),
    payload.count({ collection: 'categories', where: { parent: { exists: true } } }),
  ])

  const rows: ListRow[] = result.docs.map((category) => ({
    id: String(category.id),
    href: `/admin/collections/categories/${category.id}`,
    cells: [
      {
        t: 'thumb',
        src: imageUrl(category.image),
        alt: category.name,
        v: category.name,
        sub: category.slug,
      },
      { t: 'text', v: nameOf(category.parent) ?? 'Top level' },
      { t: 'num', v: category.sortOrder ?? 0 },
      { t: 'bool', v: category.isActive ?? true, on: 'Visible', off: 'Hidden' },
      { t: 'date', v: category.updatedAt },
    ],
  }))

  return (
    <DataList
      title="Categories"
      basePath="/admin/collections/categories"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Name or slug"
      createHref="/admin/collections/categories/create"
      createLabel="New category"
      exportHref="/api/categories/list-export"
      kpis={[
        { label: 'All categories', value: result.totalDocs },
        { label: 'Top level', value: top.totalDocs },
        { label: 'Sub-categories', value: sub.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All' },
        { key: 'top', label: 'Top level', count: top.totalDocs },
        { key: 'sub', label: 'Sub-categories', count: sub.totalDocs },
        { key: 'inactive', label: 'Hidden' },
      ]}
      columns={[
        { header: 'Category' },
        { header: 'Parent', width: 180 },
        { header: 'Order', align: 'right', width: 90 },
        { header: 'Storefront', width: 120 },
        { header: 'Updated', width: 140 },
      ]}
      rows={rows}
      emptyMessage="No categories match this view."
    />
  )
}

export default CategoriesList
