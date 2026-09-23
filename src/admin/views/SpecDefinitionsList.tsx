import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'

const VIEWS: Record<string, Where> = {
  filters: { isFilter: { equals: true } },
  compare: { isCompare: { equals: true } },
  number: { type: { equals: 'NUMBER' } },
}

const TYPE_TONE: Record<string, Tone> = {
  TEXT: 'neutral',
  NUMBER: 'brand',
  BOOLEAN: 'accent',
}

const nameOf = (value: unknown): string =>
  value && typeof value === 'object' && 'name' in value
    ? String((value as { name: string }).name)
    : 'All categories'

export const SpecDefinitionsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)
  const where = combineWhere(VIEWS[view], searchWhere(q, ['label', 'key', 'group']))

  const [result, filterable, comparable] = await Promise.all([
    payload.find({ collection: 'spec-definitions', where, limit, page, sort: 'sortOrder', depth: 1 }),
    payload.count({ collection: 'spec-definitions', where: { isFilter: { equals: true } } }),
    payload.count({ collection: 'spec-definitions', where: { isCompare: { equals: true } } }),
  ])

  const rows: ListRow[] = result.docs.map((spec) => ({
    id: String(spec.id),
    href: `/admin/collections/spec-definitions/${spec.id}`,
    cells: [
      {
        t: 'link',
        v: spec.label,
        href: `/admin/collections/spec-definitions/${spec.id}`,
        sub: spec.key,
      },
      { t: 'text', v: spec.group ?? 'General' },
      { t: 'text', v: spec.unit || '—' },
      { t: 'pill', v: spec.type, tone: TYPE_TONE[spec.type] ?? 'neutral' },
      { t: 'text', v: nameOf(spec.category) },
      {
        t: 'pills',
        items: [
          ...(spec.isFilter ? [{ v: 'Filter', tone: 'success' as const }] : []),
          ...(spec.isCompare ? [{ v: 'Compare', tone: 'brand' as const }] : []),
        ],
      },
    ],
  }))

  return (
    <DataList
      title="Spec definitions"
      basePath="/admin/collections/spec-definitions"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Label, key, group"
      createHref="/admin/collections/spec-definitions/create"
      createLabel="New spec"
      kpis={[
        { label: 'Definitions', value: result.totalDocs },
        { label: 'Used as filters', value: filterable.totalDocs },
        { label: 'Shown in compare', value: comparable.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All specs' },
        { key: 'filters', label: 'Filterable', count: filterable.totalDocs },
        { key: 'compare', label: 'Comparable', count: comparable.totalDocs },
        { key: 'number', label: 'Numeric' },
      ]}
      columns={[
        { header: 'Spec' },
        { header: 'Group', width: 140 },
        { header: 'Unit', width: 90 },
        { header: 'Type', width: 110 },
        { header: 'Scope', width: 160 },
        { header: 'Storefront use', width: 180 },
      ]}
      rows={rows}
      emptyMessage="No spec definitions match this view."
    />
  )
}

export default SpecDefinitionsList
