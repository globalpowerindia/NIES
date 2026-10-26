import type { PayloadRequest } from 'payload'
import { sql } from 'drizzle-orm'

import { toSlug } from '@/fields/slug'
import { parseCsv } from '@/lib/csv'
import { COLUMNS, type ColumnKey } from '@/lib/product-import-columns'
import { DEFAULT_GST_RATE_BPS, formatCurrency, GST_RATES_BPS, rupeesToPaise } from '@/lib/money'
import { loadUnpublishedDrafts } from '@/lib/product-drafts'
import { refreshProductsWhere } from '@/lib/search-document'
import { readDB } from '@/lib/transaction'

/**
 * Adding and updating products from a CSV file, for the admin's
 * Catalogue → Import / export page.
 *
 * One row per variant, keyed by SKU. A known SKU updates that variant and its
 * product; a new SKU becomes a variant of the product with the same name, or
 * of a new product when there's none. A blank cell leaves the value as it is,
 * so a file can carry only the columns being changed.
 *
 * Stock is the count on hand to end up with. It's recorded as a count
 * correction in the stock ledger, never written over, so the ledger still
 * accounts for every unit.
 *
 * `planImport` works out every change and every error without touching the
 * database; the admin previews it, and `applyImport` makes exactly those
 * changes in one transaction, as the staff user, so roles and the audit log
 * apply as they do to edits by hand.
 */

export const MAX_IMPORT_ROWS = 2000

/** The products collection's default: power tools. */
const DEFAULT_HSN_CODE = '8467'

const COLUMN_KEYS = new Set<string>(COLUMNS.map((column) => column.key))

type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
// DRAFT is shown as Hidden, so it isn't confused with the admin's Save draft.
const STATUS_LABEL: Record<Status, string> = { DRAFT: 'Hidden', ACTIVE: 'Active', ARCHIVED: 'Archived' }

/** Fields as the products collection names them; categories and brands by id. */
export type ProductFields = Partial<{
  name: string
  category: number
  brand: number
  modelNumber: string
  status: Status
  sellOnline: boolean
  gstRateBps: number
  hsnCode: string
  shortDesc: string
  /** The product's whole spec list: the array field is written as one. */
  specValues: SpecValue[]
}>

/** One spec on a product, as the products collection's `specValues` array holds it. */
export type SpecValue = { definition: number; valueText?: string | null; valueNum?: number | null; valueBool?: boolean | null }

/** Fields as the product-variants collection names them. */
export type VariantFields = Partial<{
  name: string
  mrpPaise: number
  sellingPricePaise: number
  weightGrams: number
  barcode: string
}>

/** One data row, read and checked. A field left undefined was blank: leave it as it is. */
type ImportRow = {
  line: number
  sku: string
  productName?: string
  categoryRef?: string
  brandRef?: string
  product: Omit<ProductFields, 'name' | 'category' | 'brand'>
  variant: VariantFields
  stock?: number
  /** Spec key (lower case) → the cell as written; blank cells are left out. */
  specs: Map<string, string>
  errors: string[]
}

// ─── Reading the file ───────────────────────────────────────────────────────

/** `Selling Price`, `selling-price` and `selling_price` are one column. */
const columnKey = (header: string) => header.trim().toLowerCase().replace(/[\s-]+/g, '_')

/** `spec:voltage` (or `Spec: voltage`) → `voltage`, matched case-insensitively. */
export const SPEC_PREFIX = 'spec:'
const specKeyOf = (header: string) => {
  const match = /^\s*spec\s*:\s*(.+?)\s*$/i.exec(header)
  return match ? match[1].toLowerCase() : undefined
}

const readMoney = (value: string, label: string, errors: string[]) => {
  const plain = value.replace(/₹|rs\.?|inr|,|\s/gi, '')
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) {
    errors.push(`${label} must be an amount in rupees, like 2499 or 2499.50.`)
    return undefined
  }
  return rupeesToPaise(Number(plain))
}

const readWhole = (value: string, label: string, errors: string[]) => {
  const plain = value.replace(/,/g, '').trim()
  if (!/^\d+$/.test(plain) || !Number.isSafeInteger(Number(plain))) {
    errors.push(`${label} must be a whole number, 0 or more.`)
    return undefined
  }
  return Number(plain)
}

const readGst = (value: string, errors: string[]) => {
  const percent = Number(value.replace('%', '').trim())
  const bps = Math.round(percent * 100)
  if (!Number.isFinite(percent) || !(GST_RATES_BPS as readonly number[]).includes(bps)) {
    errors.push(`gst_percent must be one of ${GST_RATES_BPS.map((rate) => rate / 100).join(', ')}.`)
    return undefined
  }
  return bps
}

const readStatus = (value: string, errors: string[]): Status | undefined => {
  const status = value.trim().toUpperCase()
  // "Draft" is the old name for Hidden; files made before the rename still work.
  if (status === 'HIDDEN' || status === 'DRAFT') return 'DRAFT'
  if (status === 'ACTIVE' || status === 'ARCHIVED') return status
  errors.push('status must be Hidden, Active or Archived.')
  return undefined
}

const readYesNo = (value: string, errors: string[]) => {
  const answer = value.trim().toLowerCase()
  if (['yes', 'y', 'true', '1'].includes(answer)) return true
  if (['no', 'n', 'false', '0'].includes(answer)) return false
  errors.push('sell_online must be Yes or No.')
  return undefined
}

type ReadResult = { rows: ImportRow[]; fileErrors: string[]; ignoredColumns: string[]; specKeys: string[] }

/** The file's rows, each with its own problems; problems with the file as a whole separately. */
export const readImportFile = (text: string): ReadResult => {
  const [header, ...body] = parseCsv(text)
  if (!header) return { rows: [], fileErrors: ['The file is empty.'], ignoredColumns: [], specKeys: [] }

  // Spec columns get their own keys, so a spec called "sku" can't pass for the sku column.
  const specOf = header.map(specKeyOf)
  const keys = header.map((cell, index) => (specOf[index] ? `${SPEC_PREFIX}${specOf[index]}` : columnKey(cell)))
  const known = (key: string) => COLUMN_KEYS.has(key) || key.startsWith(SPEC_PREFIX)
  const fileErrors: string[] = []
  if (!keys.includes('sku')) fileErrors.push('The first row must name the columns, including "sku". Download the template to start from.')
  const repeated = keys.filter((key, index) => known(key) && keys.indexOf(key) !== index)
  if (repeated.length) fileErrors.push(`These columns appear twice: ${[...new Set(repeated)].join(', ')}.`)
  if (body.length > MAX_IMPORT_ROWS) fileErrors.push(`The file has ${body.length} rows; import at most ${MAX_IMPORT_ROWS} at a time.`)
  if (!body.length) fileErrors.push('The file has no rows under the column names.')
  const ignoredColumns = header.filter((_, index) => keys[index] && !known(keys[index]))
  const specKeys = specOf.filter((key): key is string => Boolean(key))
  if (fileErrors.length) return { rows: [], fileErrors, ignoredColumns, specKeys }

  const seen = new Map<string, number>()
  const rows = body.map((cells, index): ImportRow => {
    const line = index + 2
    const errors: string[] = []
    const cell = (key: ColumnKey) => {
      const at = keys.indexOf(key)
      const value = at === -1 ? '' : (cells[at] ?? '').trim()
      return value === '' ? undefined : value
    }
    const read = <T>(key: ColumnKey, parse: (value: string) => T | undefined) => {
      const value = cell(key)
      return value === undefined ? undefined : parse(value)
    }

    const sku = cell('sku') ?? ''
    if (!sku) errors.push('sku is empty.')
    else if (seen.has(sku)) errors.push(`SKU ${sku} is also on row ${seen.get(sku)}. Each SKU goes on one row.`)
    else seen.set(sku, line)

    const shortDesc = cell('short_description')
    if (shortDesc && shortDesc.length > 300) errors.push(`short_description is ${shortDesc.length} characters; the limit is 300.`)

    return {
      line,
      sku,
      productName: cell('product_name'),
      categoryRef: cell('category'),
      brandRef: cell('brand'),
      product: {
        modelNumber: cell('model_number'),
        status: read('status', (value) => readStatus(value, errors)),
        sellOnline: read('sell_online', (value) => readYesNo(value, errors)),
        gstRateBps: read('gst_percent', (value) => readGst(value, errors)),
        hsnCode: cell('hsn_code'),
        shortDesc,
      },
      variant: {
        name: cell('variant_name'),
        mrpPaise: read('mrp', (value) => readMoney(value, 'mrp', errors)),
        sellingPricePaise: read('selling_price', (value) => readMoney(value, 'selling_price', errors)),
        weightGrams: read('weight_grams', (value) => readWhole(value, 'weight_grams', errors)),
        barcode: cell('barcode'),
      },
      stock: read('stock', (value) => readWhole(value, 'stock', errors)),
      specs: new Map(
        specOf.flatMap((key, at) => {
          const value = (cells[at] ?? '').trim()
          return key && value ? [[key, value] as const] : []
        }),
      ),
      errors,
    }
  })
  return { rows, fileErrors, ignoredColumns, specKeys }
}

// ─── The catalogue as it stands ─────────────────────────────────────────────

type Named = { id: number; name: string; slug: string }

export type CatalogueProduct = {
  id: number
  name: string
  slug: string
  status: Status
  sellOnline: boolean
  category: number | null
  brand: number | null
  modelNumber: string | null
  gstRateBps: number
  hsnCode: string | null
  shortDesc: string | null
  specValues: SpecValue[]
}

export type SpecDefinition = {
  id: number
  key: string
  label: string
  unit: string | null
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN'
  group: string | null
  sortOrder: number
}

export type CatalogueVariant = {
  id: number
  sku: string
  product: number
  name: string
  mrpPaise: number
  sellingPricePaise: number
  isActive: boolean
  weightGrams: number | null
  barcode: string | null
}

export type Catalogue = {
  categories: (Named & { parent: number | null })[]
  brands: Named[]
  specs: SpecDefinition[]
  products: CatalogueProduct[]
  variants: CatalogueVariant[]
  /** By variant id. */
  stock: Map<number, { onHand: number; reserved: number }>
  /** Products with a draft not yet published. */
  unpublished: Set<number>
}

const idOf = (value: unknown): number | null =>
  typeof value === 'number' ? value : value && typeof value === 'object' && 'id' in value ? Number(value.id) : null

/**
 * Everything an import compares against. Read through `req`, so inside an
 * import's transaction it sees that transaction; `lockSkus` holds those
 * SKUs' stock rows until it commits, so a sale can't land between the count
 * and the correction.
 */
export const loadCatalogue = async (req: PayloadRequest, { lockSkus = [] }: { lockSkus?: string[] } = {}): Promise<Catalogue> => {
  const { payload } = req
  const all = { pagination: false, depth: 0, overrideAccess: true, req } as const
  const [categories, brands, specs, products, variants] = await Promise.all([
    payload.find({ collection: 'categories', ...all, select: { name: true, slug: true, parent: true } }),
    payload.find({ collection: 'brands', ...all, select: { name: true, slug: true } }),
    payload.find({
      collection: 'spec-definitions',
      ...all,
      sort: ['group', 'sortOrder', 'label'],
      select: { key: true, label: true, unit: true, type: true, group: true, sortOrder: true },
    }),
    payload.find({
      collection: 'products',
      ...all,
      select: {
        name: true,
        slug: true,
        status: true,
        sellOnline: true,
        category: true,
        brand: true,
        modelNumber: true,
        gstRateBps: true,
        hsnCode: true,
        shortDesc: true,
        specValues: true,
      },
    }),
    payload.find({
      collection: 'product-variants',
      ...all,
      sort: ['product', 'sortOrder', 'id'],
      select: { sku: true, product: true, name: true, mrpPaise: true, sellingPricePaise: true, isActive: true, weightGrams: true, barcode: true },
    }),
  ])
  const db = await readDB(req)
  if (lockSkus.length) {
    await db.execute(sql`
      SELECT i.id FROM inventory i JOIN product_variants v ON v.id = i.variant_id
      WHERE v.sku IN (${sql.join(lockSkus.map((sku) => sql`${sku}`), sql`, `)})
      ORDER BY i.id FOR UPDATE OF i
    `)
  }
  const [stockRows, unpublished] = await Promise.all([
    db.execute(sql`SELECT variant_id, on_hand, reserved FROM inventory`),
    loadUnpublishedDrafts(db),
  ])

  return {
    categories: categories.docs.map(({ id, name, slug, parent }) => ({ id, name, slug, parent: idOf(parent) })),
    brands: brands.docs.map(({ id, name, slug }) => ({ id, name, slug })),
    specs: specs.docs.map((spec) => ({
      id: spec.id,
      key: spec.key,
      label: spec.label,
      unit: spec.unit ?? null,
      type: spec.type,
      group: spec.group ?? null,
      sortOrder: spec.sortOrder ?? 0,
    })),
    products: products.docs.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      sellOnline: Boolean(product.sellOnline),
      category: idOf(product.category),
      brand: idOf(product.brand),
      modelNumber: product.modelNumber ?? null,
      gstRateBps: product.gstRateBps,
      hsnCode: product.hsnCode ?? null,
      shortDesc: product.shortDesc ?? null,
      specValues: (product.specValues ?? []).flatMap((spec) => {
        const definition = idOf(spec.definition)
        return definition === null ? [] : [{ definition, valueText: spec.valueText ?? null, valueNum: spec.valueNum ?? null, valueBool: spec.valueBool ?? null }]
      }),
    })),
    variants: variants.docs.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      product: idOf(variant.product) ?? 0,
      name: variant.name,
      mrpPaise: variant.mrpPaise,
      sellingPricePaise: variant.sellingPricePaise,
      isActive: variant.isActive !== false,
      weightGrams: variant.weightGrams ?? null,
      barcode: variant.barcode ?? null,
    })),
    stock: new Map(
      stockRows.rows.map((row) => [Number(row.variant_id), { onHand: Number(row.on_hand), reserved: Number(row.reserved) }]),
    ),
    unpublished,
  }
}

// ─── Planning ───────────────────────────────────────────────────────────────

/** What the staff user's role allows, from `can()`. */
export type ImportPermissions = {
  createProducts: boolean
  updateProducts: boolean
  createVariants: boolean
  updateVariants: boolean
  editPrices: boolean
  recordStock: boolean
}

export type PlannedVariant = {
  line: number
  sku: string
  /** Absent for a new SKU. */
  id?: number
  fields: VariantFields
  /** The count on hand now, and what it becomes; absent when unchanged. */
  stock?: { from: number; to: number }
}

export type PlannedProduct = {
  /** Absent for a new product. */
  id?: number
  name: string
  fields: ProductFields
  variants: PlannedVariant[]
}

export type RowAction = 'new-product' | 'new-variant' | 'update' | 'unchanged' | 'error'

export type PreviewRow = { line: number; sku: string; product: string; action: RowAction; changes: string[]; errors: string[] }

export type ImportSummary = { newProducts: number; newVariants: number; updated: number; unchanged: number; errors: number }

export type ImportPlan = {
  ok: boolean
  products: PlannedProduct[]
  rows: PreviewRow[]
  summary: ImportSummary
  fileErrors: string[]
  ignoredColumns: string[]
}

const lower = (value: string) => value.trim().toLowerCase()

/** Name or slug → id, with every match so an ambiguous name can be refused. */
const lookup = (items: Named[]) => {
  const byKey = new Map<string, Named[]>()
  for (const item of items) {
    for (const key of new Set([lower(item.name), lower(item.slug)])) byKey.set(key, [...(byKey.get(key) ?? []), item])
  }
  return byKey
}

const resolve = (ref: string | undefined, byKey: Map<string, Named[]>, kind: 'Category' | 'Brand', where: string, errors: string[]) => {
  if (ref === undefined) return undefined
  const matches = byKey.get(lower(ref)) ?? []
  if (matches.length === 1) return matches[0].id
  if (matches.length === 0) errors.push(`${kind} "${ref}" doesn't exist. Add it under ${where} first, or check the spelling.`)
  else errors.push(`More than one ${kind.toLowerCase()} is called "${ref}". Use its slug instead: ${matches.map((m) => m.slug).join(', ')}.`)
  return undefined
}

const rupees = (paise: number) => formatCurrency(paise, { showPaise: paise % 100 !== 0 })
const shown = (value: string | null | undefined) => (value ? `"${value}"` : 'blank')

/** Typed by its definition; numbers are stored x100, so 12.5 mm is 1250. A unit after the number is allowed. */
const readSpec = (spec: SpecDefinition, raw: string, errors: string[]): SpecValue | undefined => {
  const value = { definition: spec.id, valueText: null, valueNum: null, valueBool: null }
  if (spec.type === 'TEXT') return { ...value, valueText: raw }
  if (spec.type === 'BOOLEAN') {
    const answer = raw.toLowerCase()
    if (['yes', 'y', 'true', '1'].includes(answer)) return { ...value, valueBool: true }
    if (['no', 'n', 'false', '0'].includes(answer)) return { ...value, valueBool: false }
    errors.push(`${SPEC_PREFIX}${spec.key} must be Yes or No.`)
    return undefined
  }
  const unit = spec.unit?.trim()
  const plain = (unit && raw.toLowerCase().endsWith(unit.toLowerCase()) ? raw.slice(0, -unit.length) : raw).replace(/,/g, '').trim()
  const number = Number(plain)
  if (plain === '' || !Number.isFinite(number)) {
    errors.push(`${SPEC_PREFIX}${spec.key} must be a number${unit ? ` in ${unit}` : ''}, like 12.5.`)
    return undefined
  }
  return { ...value, valueNum: Math.round(number * 100) }
}

/** The value as the import and export write it: numbers plain, in the spec's unit. */
const specCell = (spec: SpecDefinition, value: SpecValue | null | undefined): string => {
  if (!value) return ''
  if (spec.type === 'NUMBER') return value.valueNum == null ? '' : String(value.valueNum / 100)
  if (spec.type === 'BOOLEAN') return value.valueBool == null ? '' : value.valueBool ? 'Yes' : 'No'
  return value.valueText ?? ''
}

const specShown = (spec: SpecDefinition, value: SpecValue | null | undefined) => {
  const cell = specCell(spec, value)
  return cell === '' ? 'blank' : spec.type === 'NUMBER' && spec.unit ? `${cell} ${spec.unit}` : cell
}

type Group = { key: string; existing?: CatalogueProduct; name: string; rows: ImportRow[] }

/**
 * Every change the file would make, and every reason it can't. Pure: the
 * catalogue and permissions come in, so the preview and the apply step
 * (which re-plans inside its transaction) reach the same answer.
 */
export const planImport = (text: string, catalogue: Catalogue, may: ImportPermissions): ImportPlan => {
  const { rows, fileErrors, ignoredColumns, specKeys } = readImportFile(text)
  const specByKey = new Map(catalogue.specs.map((spec) => [lower(spec.key), spec]))
  const specById = new Map(catalogue.specs.map((spec) => [spec.id, spec]))
  for (const key of specKeys) {
    if (!specByKey.has(key)) {
      fileErrors.push(`No spec has the key "${key}" (column ${SPEC_PREFIX}${key}). The import page lists every spec key; new specs are added under Catalogue → Spec definitions.`)
    }
  }
  const empty = { newProducts: 0, newVariants: 0, updated: 0, unchanged: 0, errors: 0 }
  if (fileErrors.length) return { ok: false, products: [], rows: [], summary: empty, fileErrors, ignoredColumns }

  const variantBySku = new Map(catalogue.variants.map((variant) => [variant.sku, variant]))
  const productById = new Map(catalogue.products.map((product) => [product.id, product]))
  const productsByName = new Map<string, CatalogueProduct[]>()
  for (const product of catalogue.products) productsByName.set(lower(product.name), [...(productsByName.get(lower(product.name)) ?? []), product])
  const categories = lookup(catalogue.categories)
  const brands = lookup(catalogue.brands)
  const categoryName = new Map(catalogue.categories.map((category) => [category.id, category.name]))
  const brandName = new Map(catalogue.brands.map((brand) => [brand.id, brand.name]))

  // Rows grouped by the product they belong to, in file order.
  const groups = new Map<string, Group>()
  const rowGroup = new Map<ImportRow, Group>()
  for (const row of rows) {
    if (!row.sku) continue
    const existingVariant = variantBySku.get(row.sku)
    let key: string
    let existing: CatalogueProduct | undefined
    if (existingVariant) {
      existing = productById.get(existingVariant.product)
      key = `id:${existingVariant.product}`
    } else if (!row.productName) {
      row.errors.push(`SKU ${row.sku} is new, so it needs a product_name: the product it belongs to.`)
      continue
    } else {
      const matches = productsByName.get(lower(row.productName)) ?? []
      if (matches.length > 1) {
        row.errors.push(`More than one product is called "${row.productName}". Add this SKU from that product's Price & stock tab instead.`)
        continue
      }
      existing = matches[0]
      key = existing ? `id:${existing.id}` : `new:${lower(row.productName)}`
    }
    const group = groups.get(key) ?? { key, existing, name: existing?.name ?? row.productName ?? row.sku, rows: [] }
    group.rows.push(row)
    groups.set(key, group)
    rowGroup.set(row, group)
  }

  const products: PlannedProduct[] = []
  const changesOf = new Map<ImportRow, string[]>()

  for (const group of groups.values()) {
    const { existing } = group
    const first = group.rows[0]

    // Product values: rows of one product mustn't disagree.
    const wanted: ProductFields = {}
    const givenOn = new Map<keyof ProductFields, ImportRow>()
    const want = <K extends keyof ProductFields>(row: ImportRow, field: K, value: ProductFields[K] | undefined, column: string) => {
      if (value === undefined) return
      const earlier = givenOn.get(field)
      if (earlier && wanted[field] !== value) {
        row.errors.push(`${column} differs from row ${earlier.line}, which is the same product.`)
        return
      }
      wanted[field] = value
      givenOn.set(field, row)
    }
    for (const row of group.rows) {
      // A new product's name is how its rows were grouped; an existing one's may be renamed.
      if (existing && variantBySku.has(row.sku)) want(row, 'name', row.productName, 'product_name')
      want(row, 'category', resolve(row.categoryRef, categories, 'Category', 'Catalogue → Categories', row.errors), 'category')
      want(row, 'brand', resolve(row.brandRef, brands, 'Brand', 'Catalogue → Brands', row.errors), 'brand')
      for (const [field, value] of Object.entries(row.product) as [keyof ImportRow['product'], never][]) {
        want(row, field, value, field)
      }
    }

    // What actually changes, and how the preview says it.
    const fields: ProductFields = {}
    const productChanges: string[] = []
    const describe: {
      [K in Exclude<keyof ProductFields, 'specValues'>]-?: (from: ProductFields[K] | null | undefined, to: ProductFields[K]) => string
    } = {
      name: (from, to) => `Product name ${shown(from)} → ${shown(to)}`,
      category: (from, to) => `Category ${from ? categoryName.get(from) : 'none'} → ${categoryName.get(to!)}`,
      brand: (from, to) => `Brand ${from ? brandName.get(from) : 'none'} → ${brandName.get(to!)}`,
      modelNumber: (from, to) => `Model ${shown(from)} → ${shown(to)}`,
      status: (from, to) => `Status ${from ? STATUS_LABEL[from] : 'none'} → ${STATUS_LABEL[to!]}`,
      sellOnline: (from, to) => `Sell online ${from ? 'yes' : 'no'} → ${to ? 'yes' : 'no (enquiry only)'}`,
      gstRateBps: (from, to) => `GST ${Number(from) / 100}% → ${to! / 100}%`,
      hsnCode: (from, to) => `HSN ${shown(from)} → ${shown(to)}`,
      shortDesc: () => 'Short description updated',
    }
    for (const [field, value] of Object.entries(wanted) as [keyof typeof describe, never][]) {
      const current = existing?.[field]
      if (existing && current === value) continue
      ;(fields as Record<string, unknown>)[field] = value
      if (existing) productChanges.push(describe[field](current as never, value))
    }

    // Specs: each given cell, typed by its definition. `-` clears one; others on the product stay.
    const wantedSpecs = new Map<number, { value: SpecValue | null; row: ImportRow }>()
    for (const row of group.rows) {
      for (const [key, raw] of row.specs) {
        const spec = specByKey.get(key)!
        const value = raw === '-' ? null : readSpec(spec, raw, row.errors)
        if (value === undefined) continue
        const earlier = wantedSpecs.get(spec.id)
        if (earlier && specCell(spec, earlier.value) !== specCell(spec, value)) {
          row.errors.push(`${SPEC_PREFIX}${spec.key} differs from row ${earlier.row.line}, which is the same product.`)
          continue
        }
        wantedSpecs.set(spec.id, { value, row })
      }
    }
    if (wantedSpecs.size) {
      const current = existing?.specValues ?? []
      const next: SpecValue[] = []
      const specChanges: string[] = []
      const placed = new Set<number>()
      const change = (id: number, from: SpecValue | undefined, to: SpecValue | null) => {
        const spec = specById.get(id)!
        if (specCell(spec, from) === specCell(spec, to)) return
        specChanges.push(existing ? `${spec.label}: ${specShown(spec, from)} → ${specShown(spec, to)}` : `${spec.label}: ${specShown(spec, to)}`)
      }
      // Changed specs keep their place in the product's list; new ones go on the end.
      for (const value of current) {
        const want = wantedSpecs.get(value.definition)
        if (!want) next.push(value)
        else if (!placed.has(value.definition)) {
          placed.add(value.definition)
          if (want.value) next.push(want.value)
          change(value.definition, value, want.value)
        }
      }
      for (const [id, want] of wantedSpecs) {
        if (placed.has(id) || !want.value) continue
        next.push(want.value)
        change(id, undefined, want.value)
      }
      if (specChanges.length) {
        fields.specValues = next
        productChanges.push(...specChanges)
      }
    }
    if (!existing) {
      fields.name = first.productName ?? group.name
      fields.status ??= 'DRAFT'
      const taken = catalogue.products.find((product) => product.slug === toSlug(fields.name!))
      if (taken) {
        first.errors.push(`"${fields.name}" would have the same web address as the existing product "${taken.name}". Use that name to add this SKU to it, or choose a different name.`)
      }
      if (fields.category === undefined && !first.errors.some((error) => error.startsWith('Category'))) {
        first.errors.push('category is required for a new product.')
      }
      // Where it lands and whether it shows, before its specs and variants.
      productChanges.unshift(
        [
          fields.category === undefined ? undefined : categoryName.get(fields.category),
          fields.brand === undefined ? undefined : brandName.get(fields.brand),
          STATUS_LABEL[fields.status],
          fields.sellOnline ? 'Sold online' : 'Enquiry only',
        ]
          .filter(Boolean)
          .join(' · '),
      )
    }

    // Variants, and their prices and stock as they'll end up.
    const variants: PlannedVariant[] = []
    const finalPrices: { selling: number; active: boolean }[] = catalogue.variants
      .filter((variant) => existing && variant.product === existing.id && !group.rows.some((row) => row.sku === variant.sku))
      .map((variant) => ({ selling: variant.sellingPricePaise, active: variant.isActive }))
    const newSkus = group.rows.filter((row) => !variantBySku.has(row.sku))

    for (const row of group.rows) {
      const current = variantBySku.get(row.sku)
      const changes: string[] = []
      const variantFields: VariantFields = {}

      if (current) {
        const { name, mrpPaise, sellingPricePaise, weightGrams, barcode } = row.variant
        if (name !== undefined && name !== current.name) {
          variantFields.name = name
          changes.push(`Variant name ${shown(current.name)} → ${shown(name)}`)
        }
        if (mrpPaise !== undefined && mrpPaise !== current.mrpPaise) {
          variantFields.mrpPaise = mrpPaise
          changes.push(`MRP ${rupees(current.mrpPaise)} → ${rupees(mrpPaise)}`)
        }
        if (sellingPricePaise !== undefined && sellingPricePaise !== current.sellingPricePaise) {
          variantFields.sellingPricePaise = sellingPricePaise
          changes.push(`Selling price ${rupees(current.sellingPricePaise)} → ${rupees(sellingPricePaise)}`)
        }
        if (weightGrams !== undefined && weightGrams !== current.weightGrams) {
          variantFields.weightGrams = weightGrams
          changes.push(`Weight ${current.weightGrams ?? '–'} g → ${weightGrams} g`)
        }
        if (barcode !== undefined && barcode !== current.barcode) {
          variantFields.barcode = barcode
          changes.push(`Barcode ${shown(current.barcode)} → ${shown(barcode)}`)
        }
      } else {
        const { mrpPaise, sellingPricePaise } = row.variant
        if (mrpPaise === undefined || sellingPricePaise === undefined) {
          if (!row.errors.some((error) => error.startsWith('mrp') || error.startsWith('selling_price'))) {
            row.errors.push('A new SKU needs both mrp and selling_price.')
          }
        }
        // Several new SKUs on one product would all be "Standard"; their SKUs tell them apart.
        const name = row.variant.name ?? (newSkus.length > 1 ? row.sku : 'Standard')
        Object.assign(variantFields, Object.fromEntries(Object.entries({ ...row.variant, name }).filter(([, value]) => value !== undefined)))
        changes.push(`Variant "${name}"`)
        if (mrpPaise !== undefined && sellingPricePaise !== undefined) changes.push(`MRP ${rupees(mrpPaise)}, selling price ${rupees(sellingPricePaise)}`)
      }

      const mrp = variantFields.mrpPaise ?? current?.mrpPaise
      const selling = variantFields.sellingPricePaise ?? current?.sellingPricePaise
      if (mrp !== undefined && selling !== undefined && selling > mrp) {
        row.errors.push(`Selling price ${rupees(selling)} is more than the MRP ${rupees(mrp)}.`)
      }
      finalPrices.push({ selling: selling ?? 0, active: current?.isActive ?? true })

      let stock: PlannedVariant['stock']
      if (row.stock !== undefined) {
        const held = current ? (catalogue.stock.get(current.id) ?? { onHand: 0, reserved: 0 }) : { onHand: 0, reserved: 0 }
        if (row.stock < held.reserved) {
          row.errors.push(`${held.reserved} units are held for orders awaiting payment, so stock can't go below ${held.reserved}.`)
        } else if (row.stock !== held.onHand) {
          stock = { from: held.onHand, to: row.stock }
          changes.push(current ? `Stock ${held.onHand} → ${row.stock}` : `Opening stock ${row.stock}`)
        }
      }

      // What the role allows.
      const pricesChange = variantFields.mrpPaise !== undefined || variantFields.sellingPricePaise !== undefined
      if (!current && !may.createVariants) row.errors.push("Your role can't add variants.")
      else if (!current && !may.editPrices) row.errors.push("Your role can't set prices, so it can't add SKUs.")
      else if (current && Object.keys(variantFields).length && !may.updateVariants) row.errors.push("Your role can't edit variants.")
      else if (current && pricesChange && !may.editPrices) row.errors.push("Your role can't change prices.")
      if (stock && !may.recordStock) row.errors.push("Your role can't record stock changes.")

      changesOf.set(row, changes)
      variants.push({ line: row.line, sku: row.sku, id: current?.id, fields: variantFields, stock })
    }

    if (existing && Object.keys(fields).length && catalogue.unpublished.has(existing.id)) {
      first.errors.push(
        `"${existing.name}" has unpublished changes in the admin. Publish or discard them there first: importing would publish them along with the file.`,
      )
    }
    if (!existing && !may.createProducts) first.errors.push("Your role can't create products.")
    if (existing && Object.keys(fields).length && !may.updateProducts) first.errors.push("Your role can't edit products.")
    if (fields.gstRateBps !== undefined && !may.editPrices && (existing || fields.gstRateBps !== DEFAULT_GST_RATE_BPS)) {
      first.errors.push("Your role can't change GST rates.")
    }
    if (fields.status === 'ACTIVE' && !finalPrices.some((price) => price.active && price.selling > 0)) {
      ;(givenOn.get('status') ?? first).errors.push('To make the product Active, give an active variant a selling price above ₹0.')
    }

    // Product changes show once, on the product's first row.
    changesOf.set(first, [...productChanges, ...(changesOf.get(first) ?? [])])
    products.push({ id: existing?.id, name: fields.name ?? group.name, fields, variants })
  }

  const preview = rows.map((row): PreviewRow => {
    const group = rowGroup.get(row)
    const changes = changesOf.get(row) ?? []
    const action: RowAction = row.errors.length
      ? 'error'
      : !group?.existing && group?.rows[0] === row
        ? 'new-product'
        : !variantBySku.has(row.sku)
          ? 'new-variant'
          : changes.length
            ? 'update'
            : 'unchanged'
    return { line: row.line, sku: row.sku, product: group?.name ?? row.productName ?? '', action, changes, errors: row.errors }
  })

  const count = (action: RowAction) => preview.filter((row) => row.action === action).length
  const summary = {
    newProducts: count('new-product'),
    newVariants: count('new-product') + count('new-variant'),
    updated: count('update'),
    unchanged: count('unchanged'),
    errors: count('error'),
  }
  return { ok: summary.errors === 0, products, rows: preview, summary, fileErrors, ignoredColumns }
}

// ─── Applying ───────────────────────────────────────────────────────────────

/** Says which row failed, so a refusal from a hook still points at the file. */
const atRow = async <T>(line: number, sku: string, run: () => Promise<T>): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Row ${line} (${sku}): ${message}`, { cause: error })
  }
}

/**
 * Makes the planned changes, through Payload as the request's staff user.
 * Call it inside a transaction: a failure part-way leaves nothing behind.
 * A product is made Active last, once its variants carry their prices, as
 * the products collection refuses to activate an unpriced product.
 */
export const applyImport = async (req: PayloadRequest, plan: ImportPlan) => {
  const { payload } = req
  const as = { req, overrideAccess: false, depth: 0 } as const
  const touched: number[] = []

  for (const product of plan.products) {
    const [first] = product.variants
    const { status, ...rest } = product.fields
    const activate = status === 'ACTIVE'
    let productId = product.id

    if (productId === undefined) {
      const created = await atRow(first.line, first.sku, () =>
        payload.create({
          collection: 'products',
          data: {
            ...rest,
            name: product.name,
            slug: toSlug(product.name),
            category: rest.category!,
            hsnCode: rest.hsnCode ?? DEFAULT_HSN_CODE,
            gstRateBps: rest.gstRateBps ?? DEFAULT_GST_RATE_BPS,
            status: activate ? 'DRAFT' : (status ?? 'DRAFT'),
            // An import goes live, like the preview said; it never leaves a draft.
            _status: 'published',
          },
          ...as,
        }),
      )
      productId = created.id
    } else if (Object.keys(rest).length || (status && !activate)) {
      await atRow(first.line, first.sku, () =>
        payload.update({
          collection: 'products',
          id: productId!,
          data: { ...rest, ...(status && !activate ? { status } : {}), _status: 'published' },
          ...as,
        }),
      )
    }

    for (const [index, variant] of product.variants.entries()) {
      await atRow(variant.line, variant.sku, async () => {
        if (variant.id === undefined) {
          const { name, mrpPaise, sellingPricePaise, ...extra } = variant.fields
          await payload.create({
            collection: 'product-variants',
            data: {
              ...extra,
              product: productId!,
              sku: variant.sku,
              name: name!,
              mrpPaise: mrpPaise!,
              sellingPricePaise: sellingPricePaise!,
              isDefault: product.id === undefined && index === 0,
              openingStock: variant.stock?.to,
            },
            ...as,
          })
          return
        }
        if (Object.keys(variant.fields).length) {
          await payload.update({ collection: 'product-variants', id: variant.id, data: variant.fields, ...as })
        }
        if (variant.stock) {
          const { from, to } = variant.stock
          await payload.create({
            collection: 'stock-movements',
            data: { variant: variant.id, type: to > from ? 'ADJUST_UP' : 'ADJUST_DOWN', quantity: Math.abs(to - from), note: 'CSV import: stock count' },
            ...as,
          })
        }
      })
    }

    if (activate) {
      await atRow(first.line, first.sku, () =>
        payload.update({ collection: 'products', id: productId!, data: { status: 'ACTIVE', _status: 'published' }, ...as }),
      )
    }
    touched.push(productId)
  }

  // The import runs without the per-save refreshes (they'd purge the storefront
  // on every row), so the search text of what it touched is rebuilt once here:
  // otherwise new SKUs wouldn't be searchable until the product was next saved.
  if (touched.length) await refreshProductsWhere(payload, { id: { in: touched } }, req)
}

// ─── Exporting ──────────────────────────────────────────────────────────────

const plainRupees = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2))

/** The category and everything under it. */
const categoryTree = (catalogue: Catalogue, rootId: number) => {
  const ids = new Set([rootId])
  for (let grew = true; grew; ) {
    grew = false
    for (const category of catalogue.categories) {
      if (category.parent !== null && ids.has(category.parent) && !ids.has(category.id)) {
        ids.add(category.id)
        grew = true
      }
    }
  }
  return ids
}

/**
 * Every variant as an import row, so the file can be edited and uploaded
 * again. A category is named by its name, or by its slug where the name is
 * shared and the import couldn't tell which was meant. `category` narrows it
 * to one category and its subcategories; either way there's a `spec:` column
 * for each spec the exported products use, and none for the rest.
 */
export const exportRows = (catalogue: Catalogue, { includeStock, category }: { includeStock: boolean; category?: number }) => {
  const label = (items: Named[]) => {
    const count = new Map<string, number>()
    for (const item of items) count.set(lower(item.name), (count.get(lower(item.name)) ?? 0) + 1)
    return new Map(items.map((item) => [item.id, count.get(lower(item.name))! > 1 ? item.slug : item.name]))
  }
  const categoryLabel = label(catalogue.categories)
  const brandLabel = label(catalogue.brands)
  const inCategory = category === undefined ? null : categoryTree(catalogue, category)
  const products = catalogue.products.filter((product) => !inCategory || (product.category !== null && inCategory.has(product.category)))
  const productById = new Map(products.map((product) => [product.id, product]))

  const used = new Set(products.flatMap((product) => product.specValues.map((value) => value.definition)))
  const specs = catalogue.specs.filter((spec) => used.has(spec.id))
  const specValue = (product: CatalogueProduct, spec: SpecDefinition) =>
    specCell(spec, product.specValues.find((value) => value.definition === spec.id))

  const rows = catalogue.variants
    .filter((variant) => productById.has(variant.product))
    .map((variant) => {
      const product = productById.get(variant.product)!
      const values: Record<ColumnKey, string | number | null> = {
        sku: variant.sku,
        product_name: product.name,
        variant_name: variant.name,
        category: product.category ? (categoryLabel.get(product.category) ?? null) : null,
        brand: product.brand ? (brandLabel.get(product.brand) ?? null) : null,
        model_number: product.modelNumber,
        status: STATUS_LABEL[product.status],
        sell_online: product.sellOnline ? 'Yes' : 'No',
        mrp: plainRupees(variant.mrpPaise),
        selling_price: plainRupees(variant.sellingPricePaise),
        gst_percent: product.gstRateBps / 100,
        hsn_code: product.hsnCode,
        stock: includeStock ? (catalogue.stock.get(variant.id)?.onHand ?? 0) : null,
        weight_grams: variant.weightGrams,
        barcode: variant.barcode,
        short_description: product.shortDesc,
      }
      return { product: product.name, values, specs: specs.map((spec) => specValue(product, spec)) }
    })
    .sort((a, b) => a.product.localeCompare(b.product))

  const keys = COLUMNS.map((column) => column.key).filter((key) => includeStock || key !== 'stock')
  return [
    [...keys, ...specs.map((spec) => `${SPEC_PREFIX}${spec.key}`)],
    ...rows.map((row) => [...keys.map((key) => row.values[key]), ...row.specs]),
  ]
}
