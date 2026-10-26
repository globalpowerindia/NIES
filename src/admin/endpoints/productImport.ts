import type { PayloadHandler, PayloadRequest } from 'payload'
import { z } from 'zod'

import { can, canEditPrices, mayImportProducts } from '@/access/permissions'
import { toCsv } from '@/lib/csv'
import { applyImport, exportRows, loadCatalogue, planImport, readImportFile, type ImportPermissions, type ImportPlan } from '@/lib/product-import'
import { purgeStorefront } from '@/lib/revalidate'
import { inTransaction } from '@/lib/transaction'

/** About 2,000 rows with every column filled. */
const MAX_CSV_CHARS = 2_000_000

const bodySchema = z.object({
  csv: z.string().min(1).max(MAX_CSV_CHARS),
  apply: z.boolean().default(false),
})

const permissionsOf = (user: unknown): ImportPermissions => ({
  createProducts: can(user, 'products', 'create'),
  updateProducts: can(user, 'products', 'update'),
  createVariants: can(user, 'product-variants', 'create'),
  updateVariants: can(user, 'product-variants', 'update'),
  editPrices: canEditPrices(user),
  recordStock: can(user, 'stock-movements', 'create'),
})

/** The plan without what only the server needs. */
const reply = ({ ok, rows, summary, fileErrors, ignoredColumns }: ImportPlan, applied: boolean, status = 200) =>
  Response.json({ ok, applied, rows, summary, fileErrors, ignoredColumns }, { status })

/**
 * Previews a product CSV, or applies it with `apply: true`. Applying plans
 * again inside the transaction, against the catalogue as it is then, and
 * changes nothing unless every row is clean. Mounted at POST /api/products/import.
 */
export const importProducts: PayloadHandler = async (req) => {
  if (!mayImportProducts(req.user)) return Response.json({ error: 'Not permitted.' }, { status: 403 })

  const parsed = bodySchema.safeParse(await req.json?.().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Choose a CSV file of up to 2 MB.' }, { status: 400 })
  }
  const { csv, apply } = parsed.data
  const may = permissionsOf(req.user)

  if (!apply) return reply(planImport(csv, await loadCatalogue(req), may), false)

  try {
    const skus = readImportFile(csv).rows.map((row) => row.sku).filter(Boolean)
    const { plan, applied } = await inTransaction(
      req.payload,
      // One import at a time: two at once would each plan against the catalogue without the other.
      ['product-import'],
      async (txReq: PayloadRequest) => {
        const plan = planImport(csv, await loadCatalogue(txReq, { lockSkus: skus }), may)
        if (!plan.ok) return { plan, applied: false }
        await applyImport(txReq, plan)
        return { plan, applied: true }
      },
      // The storefront is purged once, after the commit, not by every save inside it.
      { user: req.user, context: { skipRevalidate: true } },
    )
    if (applied) purgeStorefront(undefined)
    return reply(plan, applied, applied ? 200 : 409)
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'Product import failed' })
    const message = error instanceof Error ? error.message : 'The import failed.'
    return Response.json({ error: `Nothing was changed. ${message}` }, { status: 400 })
  }
}

/**
 * Every variant as a CSV in the import's columns, to edit and upload again.
 * Stock is left out for roles that can't see stock levels; `?category=<id>`
 * narrows it to that category and its subcategories. Mounted at
 * GET /api/products/export.
 */
export const exportProducts: PayloadHandler = async (req) => {
  if (!can(req.user, 'products', 'read')) return Response.json({ error: 'Not permitted.' }, { status: 403 })

  const catalogue = await loadCatalogue(req)
  const categoryId = Number(req.searchParams.get('category'))
  const category = catalogue.categories.find((item) => item.id === categoryId)
  const csv = toCsv(exportRows(catalogue, { includeStock: can(req.user, 'inventory', 'read'), category: category?.id }))
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${category ? `${category.slug}-` : ''}${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
