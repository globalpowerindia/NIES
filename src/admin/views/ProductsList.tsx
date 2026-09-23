import type { ListViewServerProps } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'

const VIEWS: Record<string, string> = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  archived: 'ARCHIVED',
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  DRAFT: { label: 'Draft', tone: 'warning' },
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

export const ProductsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  const where = combineWhere(
    VIEWS[view] ? { status: { equals: VIEWS[view] } } : undefined,
    searchWhere(q, ['name', 'slug', 'hsnCode']),
  )

  const [result, active, draft, archived, variants] = await Promise.all([
    payload.find({ collection: 'products', where, limit, page, sort: '-updatedAt', depth: 1 }),
    payload.count({ collection: 'products', where: { status: { equals: 'ACTIVE' } } }),
    payload.count({ collection: 'products', where: { status: { equals: 'DRAFT' } } }),
    payload.count({ collection: 'products', where: { status: { equals: 'ARCHIVED' } } }),
    payload.count({ collection: 'product-variants' }),
  ])

  const rows: ListRow[] = result.docs.map((product) => {
    const status = STATUS[product.status] ?? STATUS.DRAFT
    const specCount = (product.specValues ?? []).length
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
        { t: 'num', v: specCount, suffix: specCount === 1 ? 'spec' : 'specs' },
        { t: 'text', v: product.hsnCode, sub: `${(product.gstRateBps / 100).toFixed(0)}% GST` },
        { t: 'pill', v: status.label, tone: status.tone },
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
        { label: 'Draft', value: draft.totalDocs },
        { label: 'Archived', value: archived.totalDocs },
        { label: 'Variants', value: variants.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All products' },
        { key: 'active', label: 'Active', count: active.totalDocs },
        { key: 'draft', label: 'Draft', count: draft.totalDocs },
        { key: 'archived', label: 'Archived', count: archived.totalDocs },
      ]}
      columns={[
        { header: 'Product' },
        { header: 'Brand', width: 130 },
        { header: 'Category', width: 150 },
        { header: 'Specs', align: 'right', width: 90 },
        { header: 'Tax', width: 110 },
        { header: 'Status', width: 110 },
        { header: 'Updated', width: 140 },
      ]}
      rows={rows}
      emptyMessage="No products match this view."
    />
  )
}

export default ProductsList
