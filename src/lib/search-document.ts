import type { CollectionBeforeChangeHook, Payload, PayloadRequest, Where } from 'payload'

/**
 * A Postgres generated column can only read its own row, so everything a
 * shopper might search by is denormalised onto the product first. The three
 * fields map to full-text weights (see `searchVectorSchema`):
 *
 *   A  name, brand, model number, every variant SKU  — what people actually type
 *   B  the category path, parents included           — "grinder" finds the whole aisle
 *   C  short description and filterable spec values  — "18V", "13mm", "850W"
 *
 * They are hidden: staff never edit them, and they would only be noise in the
 * admin. Hooks on brands, categories and variants re-save affected products so
 * the document cannot go stale.
 */

const clean = (parts: (string | null | undefined)[]): string =>
  [...new Set(parts.filter((part): part is string => Boolean(part && part.trim())).map((part) => part.trim()))].join(' ')

type ProductLike = {
  id?: number
  name?: string | null
  modelNumber?: string | null
  shortDesc?: string | null
  brand?: unknown
  category?: unknown
  specValues?: { valueText?: string | null; valueBool?: boolean | null }[] | null
}

const nameOf = (relation: unknown): string | null =>
  relation && typeof relation === 'object' && 'name' in relation ? String((relation as { name: unknown }).name) : null

const idOf = (relation: unknown): number | null => {
  if (typeof relation === 'number') return relation
  if (relation && typeof relation === 'object' && 'id' in relation) return Number((relation as { id: unknown }).id)
  return null
}

/** Walks a category to the root so a product under "Drills" also matches "Power Tools". */
const categoryPath = async (payload: Payload, start: unknown): Promise<string[]> => {
  const names: string[] = []
  let id = idOf(start)
  const seen = new Set<number>()
  while (id !== null && !seen.has(id)) {
    seen.add(id)
    const category = await payload.findByID({ collection: 'categories', id, depth: 0, disableErrors: true })
    if (!category) break
    names.push(category.name)
    id = idOf(category.parent)
  }
  return names
}

const variantTerms = async (payload: Payload, productId: number | undefined): Promise<string[]> => {
  if (!productId) return []
  const { docs } = await payload.find({
    collection: 'product-variants',
    where: { product: { equals: productId } },
    pagination: false,
    depth: 0,
    select: { sku: true, name: true },
  })
  return docs.flatMap((variant) => [variant.sku, variant.name].filter(Boolean) as string[])
}

export const buildSearchDocument = async (
  payload: Payload,
  product: ProductLike,
): Promise<{ searchA: string; searchB: string; searchC: string }> => {
  const brandName = nameOf(product.brand) ?? (await brandNameById(payload, product.brand))
  const [path, skus] = await Promise.all([
    categoryPath(payload, product.category),
    variantTerms(payload, product.id),
  ])

  const specs = (product.specValues ?? []).map((entry) => entry.valueText).filter(Boolean) as string[]

  return {
    searchA: clean([product.name, brandName, product.modelNumber, ...skus]),
    searchB: clean(path),
    searchC: clean([product.shortDesc, ...specs]),
  }
}

const brandNameById = async (payload: Payload, brand: unknown): Promise<string | null> => {
  const id = idOf(brand)
  if (id === null) return null
  const doc = await payload.findByID({ collection: 'brands', id, depth: 0, disableErrors: true })
  return doc?.name ?? null
}

export const fillSearchDocument: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  const document = await buildSearchDocument(req.payload, {
    ...(originalDoc ?? {}),
    ...data,
    id: originalDoc?.id ?? data.id,
  })
  return { ...data, ...document }
}

/**
 * Re-saves every product whose document depends on a record that just changed.
 * Catalogue-sized work (tens of rows), so it runs inline rather than queued.
 */
/**
 * Re-saves products so `fillSearchDocument` rebuilds their search text. Pass
 * the hook's `req` so this runs inside the same transaction: from a separate
 * one it would wait on the very rows that transaction has locked (saving a
 * variant locks its product), and never finish.
 */
export const refreshProductsWhere = async (payload: Payload, where: Where, req?: PayloadRequest): Promise<void> => {
  const { docs } = await payload.find({ collection: 'products', where, pagination: false, depth: 0, req })
  for (const { id } of docs) {
    await payload.update({ collection: 'products', id, data: {}, req, context: { skipRevalidate: true } })
  }
}
