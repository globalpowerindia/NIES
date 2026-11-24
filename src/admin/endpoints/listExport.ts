import type { PayloadHandler, PayloadRequest } from 'payload'

import { can } from '@/access/permissions'
import { categoriesWhere, productsWhere, variantsWhere } from '@/admin/components/list/filters'
import { readListParams } from '@/admin/components/list/params'
import { toCsv } from '@/lib/csv'
import { loadUnpublishedDrafts } from '@/lib/product-drafts'
import { loadProductStock } from '@/lib/product-stock'

/**
 * The Categories, Variants and Products lists as CSV, for reading in a
 * spreadsheet. Each honours the list's `?view=` and `?q=`, so the file holds
 * the rows on screen across every page. (Products → Import / export has its
 * own file, in the columns the import reads back.)
 * Mounted at GET /api/<collection>/list-export.
 */

type Row = (string | number | null | undefined)[]

const rupees = (paise: number | null | undefined) => (typeof paise === 'number' ? (paise / 100).toFixed(2) : '')
const yesNo = (value: boolean | null | undefined) => (value ? 'Yes' : 'No')
const nameOf = (value: unknown): string =>
  value && typeof value === 'object' && 'name' in value ? String((value as { name: string }).name) : ''

const paramsOf = (req: PayloadRequest) => readListParams(Object.fromEntries(req.searchParams ?? []))

const csvResponse = (name: string, rows: Row[], filtered: boolean) => {
  const date = new Date().toISOString().slice(0, 10)
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}${filtered ? '-filtered' : ''}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

const forbidden = () => Response.json({ error: 'Not permitted.' }, { status: 403 })

export const exportCategoriesCsv: PayloadHandler = async (req) => {
  if (!can(req.user, 'categories', 'read')) return forbidden()
  const { view, q } = paramsOf(req)

  const { docs } = await req.payload.find({
    collection: 'categories',
    where: categoriesWhere(view, q),
    sort: 'sortOrder',
    pagination: false,
    depth: 1,
    req,
    overrideAccess: false,
  })

  const rows: Row[] = [
    ['ID', 'Name', 'Slug', 'Parent', 'Description', 'Sort order', 'Visible', 'Delivery in Kerala (₹)', 'Delivery outside Kerala (₹)', 'Created', 'Updated'],
    ...docs.map((category) => [
      category.id,
      category.name,
      category.slug,
      nameOf(category.parent) || 'Top level',
      category.description,
      category.sortOrder ?? 0,
      yesNo(category.isActive ?? true),
      rupees(category.deliveryKeralaPaise),
      rupees(category.deliveryOutOfStatePaise),
      category.createdAt,
      category.updatedAt,
    ]),
  ]
  return csvResponse('categories', rows, view !== 'all' || Boolean(q))
}

const POWER: Record<string, string> = { CORDED: 'Corded', CORDLESS: 'Cordless' }
const PACK: Record<string, string> = { BARE_TOOL: 'Bare tool', KIT: 'Kit' }

export const exportVariantsCsv: PayloadHandler = async (req) => {
  if (!can(req.user, 'product-variants', 'read')) return forbidden()
  const { view, q } = paramsOf(req)

  const { docs } = await req.payload.find({
    collection: 'product-variants',
    where: variantsWhere(view, q),
    sort: 'sku',
    pagination: false,
    depth: 1,
    select: {
      sku: true,
      name: true,
      product: true,
      powerSource: true,
      batteryAh: true,
      packType: true,
      mrpPaise: true,
      sellingPricePaise: true,
      weightGrams: true,
      barcode: true,
      isDefault: true,
      isActive: true,
      sortOrder: true,
      updatedAt: true,
    },
    populate: { products: { name: true } },
    req,
    overrideAccess: false,
  })

  const rows: Row[] = [
    ['ID', 'SKU', 'Variant name', 'Product', 'Power source', 'Battery (Ah)', 'Pack', 'MRP (₹)', 'Selling price (₹)', 'Discount %', 'Weight (g)', 'Barcode', 'Default', 'Active', 'Sort order', 'Updated'],
    ...docs.map((variant) => {
      const discount =
        variant.mrpPaise > variant.sellingPricePaise
          ? Math.round(((variant.mrpPaise - variant.sellingPricePaise) / variant.mrpPaise) * 100)
          : 0
      return [
        variant.id,
        variant.sku,
        variant.name,
        nameOf(variant.product),
        variant.powerSource ? POWER[variant.powerSource] : '',
        variant.batteryAh ? (variant.batteryAh / 10).toFixed(1) : '',
        variant.packType ? PACK[variant.packType] : '',
        rupees(variant.mrpPaise),
        rupees(variant.sellingPricePaise),
        discount,
        variant.weightGrams,
        variant.barcode,
        yesNo(variant.isDefault),
        yesNo(variant.isActive ?? true),
        variant.sortOrder ?? 0,
        variant.updatedAt,
      ]
    }),
  ]
  return csvResponse('variants', rows, view !== 'all' || Boolean(q))
}

const STATUS: Record<string, string> = { ACTIVE: 'Active', DRAFT: 'Hidden', ARCHIVED: 'Archived' }
const LEVEL: Record<string, string> = { IN_STOCK: 'In stock', LOW_STOCK: 'Low stock', OUT_OF_STOCK: 'Out of stock' }

export const exportProductsCsv: PayloadHandler = async (req) => {
  if (!can(req.user, 'products', 'read')) return forbidden()
  const { view, q } = paramsOf(req)
  // Stock levels stay with the roles that may see them, as in the import file.
  const includeStock = can(req.user, 'inventory', 'read')

  const [allStock, unpublished] = await Promise.all([loadProductStock(req.payload), loadUnpublishedDrafts(req.payload.db.drizzle)])
  const { docs } = await req.payload.find({
    collection: 'products',
    where: productsWhere(view, q, allStock, unpublished),
    sort: '-updatedAt',
    pagination: false,
    depth: 1,
    select: {
      name: true,
      slug: true,
      brand: true,
      category: true,
      status: true,
      sellOnline: true,
      hsnCode: true,
      gstRateBps: true,
      createdAt: true,
      updatedAt: true,
    },
    populate: { brands: { name: true }, categories: { name: true } },
    req,
    overrideAccess: false,
  })

  const rows: Row[] = [
    [
      'ID',
      'Name',
      'Slug',
      'Brand',
      'Category',
      'Status',
      'Unpublished changes',
      'Sold online',
      'Price (₹)',
      'MRP (₹)',
      'Active variants',
      ...(includeStock ? ['Available', 'Stock level'] : []),
      'HSN code',
      'GST %',
      'Created',
      'Updated',
    ],
    ...docs.map((product) => {
      const stock = allStock.get(product.id)
      return [
        product.id,
        product.name,
        product.slug,
        nameOf(product.brand),
        nameOf(product.category),
        STATUS[product.status] ?? product.status,
        yesNo(unpublished.has(product.id)),
        product.sellOnline ? 'Yes' : 'Enquiry only',
        rupees(stock?.pricePaise),
        rupees(stock?.mrpPaise),
        stock?.activeVariants ?? 0,
        ...(includeStock
          ? [Math.max(0, stock?.available ?? 0), stock ? (stock.backorder && stock.available <= 0 ? 'Backorder' : LEVEL[stock.level]) : '']
          : []),
        product.hsnCode,
        typeof product.gstRateBps === 'number' ? product.gstRateBps / 100 : '',
        product.createdAt,
        product.updatedAt,
      ]
    }),
  ]
  return csvResponse('products', rows, view !== 'all' || Boolean(q))
}
