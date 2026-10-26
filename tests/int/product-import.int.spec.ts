import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { importProducts } from '@/admin/endpoints/productImport'
import config from '@/payload.config'
import type { Category } from '@/payload-types'

import { createStaff } from '../helpers/staff'

/** The admin's CSV import, end to end: preview, apply, the stock ledger and all-or-nothing. */

let payload: Payload
let superAdmin: Awaited<ReturnType<typeof createStaff>>['user']
let category: Category
const stamp = Date.now()
const cleanup: { collection: string; id: number }[] = []
const sku = (name: string) => `IMP-${stamp}-${name}`

const post = async (user: unknown, csv: string, apply: boolean) => {
  const req = await createLocalReq({ user: user as never }, payload)
  req.json = async () => ({ csv, apply })
  const response = await importProducts(req)
  return { status: response.status, body: await response.json() }
}

const variantBySku = async (value: string) =>
  (await payload.find({ collection: 'product-variants', where: { sku: { equals: value } }, depth: 0, overrideAccess: true })).docs[0]

const onHand = async (variantId: number) =>
  (await payload.find({ collection: 'inventory', where: { variant: { equals: variantId } }, depth: 0, overrideAccess: true })).docs[0]?.onHand

describe('Product CSV import', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    category = await payload.create({ collection: 'categories', data: { name: `Import ${stamp}` } as Category, overrideAccess: true })
    const voltage = await payload.create({
      collection: 'spec-definitions',
      data: { key: `importVoltage${stamp}`, label: 'Voltage', unit: 'V', type: 'NUMBER' },
      overrideAccess: true,
    })
    cleanup.push({ collection: 'spec-definitions', id: voltage.id })
    superAdmin = (await createStaff(payload, 'SUPER_ADMIN', cleanup as never[])).user
  })

  afterAll(async () => {
    const products = await payload.find({ collection: 'products', where: { name: { like: `${stamp}` } }, depth: 0, overrideAccess: true, pagination: false })
    for (const product of products.docs) {
      const variants = await payload.find({ collection: 'product-variants', where: { product: { equals: product.id } }, depth: 0, overrideAccess: true, pagination: false })
      for (const variant of variants.docs) {
        await payload.delete({ collection: 'stock-movements', where: { variant: { equals: variant.id } }, overrideAccess: true }).catch(() => undefined)
        await payload.delete({ collection: 'inventory', where: { variant: { equals: variant.id } }, overrideAccess: true }).catch(() => undefined)
        await payload.delete({ collection: 'product-variants', id: variant.id, overrideAccess: true }).catch(() => undefined)
      }
      await payload.delete({ collection: 'products', id: product.id, overrideAccess: true }).catch(() => undefined)
    }
    await payload.delete({ collection: 'categories', id: category.id, overrideAccess: true }).catch(() => undefined)
    for (const { collection, id } of cleanup.reverse()) {
      await payload.delete({ collection: collection as never, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('previews without saving, then creates an Active product with its variants and opening stock', async () => {
    const csv = [
      'sku,product_name,category,mrp,selling_price,status,stock',
      `${sku('A')},Import drill ${stamp},${category.name},2499,1999,Active,7`,
      `${sku('B')},Import drill ${stamp},,2999,2499,,`,
    ].join('\n')

    const preview = await post(superAdmin, csv, false)
    expect(preview.body).toMatchObject({ ok: true, applied: false, summary: { newProducts: 1, newVariants: 2 } })
    expect(await variantBySku(sku('A'))).toBeUndefined()

    const applied = await post(superAdmin, csv, true)
    expect(applied).toMatchObject({ status: 200, body: { applied: true } })

    const a = await variantBySku(sku('A'))
    expect(a).toMatchObject({ mrpPaise: 249900, sellingPricePaise: 199900, isDefault: true })
    expect(await onHand(a.id)).toBe(7)
    const product = await payload.findByID({ collection: 'products', id: a.product as number, depth: 0, overrideAccess: true })
    expect(product.status).toBe('ACTIVE')
    expect(await variantBySku(sku('B'))).toMatchObject({ product: product.id, name: sku('B') })
  })

  it('updates prices and specs, and records a stock count as a correction in the ledger', async () => {
    const a = await variantBySku(sku('A'))
    const result = await post(superAdmin, `sku,selling_price,stock,spec:importVoltage${stamp}\n${sku('A')},1899,10,230 V`, true)
    expect(result.body).toMatchObject({ applied: true, summary: { updated: 1 } })

    expect(await variantBySku(sku('A'))).toMatchObject({ sellingPricePaise: 189900 })
    const product = await payload.findByID({ collection: 'products', id: a.product as number, depth: 0, overrideAccess: true })
    expect(product.specValues).toMatchObject([{ valueNum: 23000 }])
    expect(await onHand(a.id)).toBe(10)
    const movements = await payload.find({ collection: 'stock-movements', where: { variant: { equals: a.id } }, sort: '-createdAt', depth: 0, overrideAccess: true })
    expect(movements.docs[0]).toMatchObject({ type: 'ADJUST_UP', quantity: 3, note: 'CSV import: stock count', recordedBy: superAdmin.id })
  })

  it('changes nothing when any row fails, even one only the database catches', async () => {
    // Two new products whose names make the same web address: the second create fails.
    const csv = [
      'sku,product_name,category,mrp,selling_price',
      `${sku('C')},Clash ${stamp},${category.name},100,90`,
      `${sku('D')},Clash-${stamp},${category.name},100,90`,
    ].join('\n')
    const result = await post(superAdmin, csv, true)
    expect(result.status).toBe(400)
    expect(result.body.error).toMatch(/^Nothing was changed\. Row 3/)
    expect(await variantBySku(sku('C'))).toBeUndefined()
  })

  it("refuses price and stock changes the role doesn't allow", async () => {
    const { user: clerk } = await createStaff(
      payload,
      { grants: { products: ['read', 'update'], 'product-variants': ['read', 'update'] }, canEditPrices: false },
      cleanup as never[],
    )
    const result = await post(clerk, `sku,selling_price,stock\n${sku('A')},1,99`, true)
    expect(result).toMatchObject({ status: 409, body: { applied: false } })
    expect(result.body.rows[0].errors).toEqual(["Your role can't change prices.", "Your role can't record stock changes."])
    expect(await variantBySku(sku('A'))).toMatchObject({ sellingPricePaise: 189900 })
  })
})
