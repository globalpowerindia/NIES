import type { CollectionAfterChangeHook } from 'payload'

import { refreshProductsWhere } from '@/lib/search-document'

/**
 * A product's search document copies its brand, category path and variant SKUs,
 * so renaming any of those leaves the copy stale until the product is saved
 * again. These hooks do that saving.
 *
 * They run after the change, and only when a field the document actually
 * copies has moved — renaming a brand rebuilds its products, changing that
 * brand's logo does not.
 */

const changed = (a: unknown, b: unknown): boolean => a !== b

export const refreshOnBrandChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context?.skipRevalidate) return doc
  if (previousDoc && !changed(doc.name, previousDoc.name)) return doc
  await refreshProductsWhere(req.payload, { brand: { equals: doc.id } }, req)
  return doc
}

export const refreshOnCategoryChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context?.skipRevalidate) return doc
  if (previousDoc && !changed(doc.name, previousDoc.name) && !changed(doc.parent, previousDoc.parent)) return doc

  // A rename high in the tree changes the document of everything beneath it.
  const descendants = await req.payload.find({
    collection: 'categories',
    where: { parent: { equals: doc.id } },
    pagination: false,
    depth: 0,
    req,
  })
  const ids = [doc.id, ...descendants.docs.map((node) => node.id)]
  await refreshProductsWhere(req.payload, { category: { in: ids } }, req)
  return doc
}

export const refreshOnVariantChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context?.skipRevalidate) return doc
  if (previousDoc && !changed(doc.sku, previousDoc.sku) && !changed(doc.name, previousDoc.name)) return doc
  const productId = typeof doc.product === 'object' ? doc.product?.id : doc.product
  if (productId) await refreshProductsWhere(req.payload, { id: { equals: productId } }, req)
  return doc
}
