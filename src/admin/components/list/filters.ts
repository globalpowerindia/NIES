import type { Where } from 'payload'

import { combineWhere, searchWhere } from '@/admin/components/list/params'
import { isPriced, type ProductStock } from '@/lib/product-stock'

/**
 * What each list's views and search select, shared by the list pages and
 * their CSV exports so a download holds exactly the rows on screen.
 */

const CATEGORY_VIEWS: Record<string, Where> = {
  top: { parent: { exists: false } },
  sub: { parent: { exists: true } },
  inactive: { isActive: { equals: false } },
}

export const categoriesWhere = (view: string, q: string): Where | undefined =>
  combineWhere(CATEGORY_VIEWS[view], searchWhere(q, ['name', 'slug']))

const VARIANT_VIEWS: Record<string, Where> = {
  active: { isActive: { equals: true } },
  inactive: { isActive: { equals: false } },
  cordless: { powerSource: { equals: 'CORDLESS' } },
  kits: { packType: { equals: 'KIT' } },
}

export const variantsWhere = (view: string, q: string): Where | undefined =>
  combineWhere(VARIANT_VIEWS[view], searchWhere(q, ['sku', 'name', 'barcode']))

// `draft` is the URL key from before Hidden was renamed; links to it keep working.
const PRODUCT_STATUS_VIEWS: Record<string, string> = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  archived: 'ARCHIVED',
}

/** Sold online or enquiry-only (WhatsApp), the `sellOnline` checkbox. */
const PRODUCT_SALE_VIEWS: Record<string, boolean> = { online: true, enquiry: false }

/** Views decided by price and stock rather than a stored field. */
export const PRODUCT_STOCK_VIEWS: Record<string, (stock: ProductStock) => boolean> = {
  noprice: (stock) => !isPriced(stock),
  out: (stock) => isPriced(stock) && stock.level === 'OUT_OF_STOCK',
  low: (stock) => isPriced(stock) && stock.level === 'LOW_STOCK',
}

export const productsWhere = (
  view: string,
  q: string,
  allStock: Map<number, ProductStock>,
  unpublished: Set<number>,
): Where | undefined => {
  const idsWhere = (test: (stock: ProductStock) => boolean): Where => ({
    id: { in: [...allStock].filter(([, stock]) => test(stock)).map(([id]) => id).concat(-1) },
  })
  const viewWhere: Where | undefined =
    view === 'unpublished'
      ? { id: { in: [...unpublished, -1] } }
      : PRODUCT_STATUS_VIEWS[view]
        ? { status: { equals: PRODUCT_STATUS_VIEWS[view] } }
        : PRODUCT_STOCK_VIEWS[view]
          ? idsWhere(PRODUCT_STOCK_VIEWS[view])
          : view in PRODUCT_SALE_VIEWS
            ? PRODUCT_SALE_VIEWS[view]
              ? { sellOnline: { equals: true } }
              : { sellOnline: { not_equals: true } }
            : undefined
  return combineWhere(viewWhere, searchWhere(q, ['name', 'slug', 'hsnCode']))
}
