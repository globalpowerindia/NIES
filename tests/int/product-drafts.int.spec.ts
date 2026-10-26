import { sql } from 'drizzle-orm'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Category, Product } from '@/payload-types'

import { createStaff } from '../helpers/staff'

/** Save draft keeps edits off the site until Publish, and nothing else publishes them by accident. */

let payload: Payload
let staff: Awaited<ReturnType<typeof createStaff>>['user']
let category: Category
const stamp = Date.now()
const cleanup: { collection: string; id: number }[] = []

/** The row the storefront reads, straight from the table. */
const live = async (id: number) => {
  const { rows } = await payload.db.drizzle.execute(sql`SELECT name, status, _status, rating_count FROM products WHERE id = ${id}`)
  return rows[0] as { name: string; status: string; _status: string; rating_count: number }
}

const publishedProduct = async (name: string) => {
  const product = await payload.create({
    collection: 'products',
    data: { name: `${name} ${stamp}`, status: 'DRAFT', category: category.id, hsnCode: '8467', gstRateBps: 1800 } as Product,
    overrideAccess: true,
  })
  cleanup.unshift({ collection: 'products', id: product.id })
  return product
}

describe('Product drafts', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    category = await payload.create({ collection: 'categories', data: { name: `Drafts ${stamp}` } as Category, overrideAccess: true })
    cleanup.push({ collection: 'categories', id: category.id })
    staff = (await createStaff(payload, 'SUPER_ADMIN', cleanup as never[])).user
  })

  afterAll(async () => {
    for (const { collection, id } of cleanup) {
      if (collection === 'products') {
        await payload.delete({ collection: 'product-variants', where: { product: { equals: id } }, overrideAccess: true }).catch(() => undefined)
      }
      await payload.delete({ collection: collection as never, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('publishes writes from scripts, as before drafts', async () => {
    const product = await publishedProduct('Script')
    expect(await live(product.id)).toMatchObject({ _status: 'published' })
  })

  it('keeps a draft off the site until it is published', async () => {
    const product = await publishedProduct('Edited')
    await payload.update({ collection: 'products', id: product.id, data: { name: `Renamed ${stamp}` }, draft: true, user: staff, overrideAccess: false })
    expect(await live(product.id)).toMatchObject({ name: `Edited ${stamp}`, _status: 'published' })

    await payload.update({ collection: 'products', id: product.id, data: { _status: 'published' }, user: staff, overrideAccess: false })
    expect(await live(product.id)).toMatchObject({ name: `Renamed ${stamp}`, _status: 'published' })
  })

  it('never shows an unpublished product as Active', async () => {
    const product = await publishedProduct('Unpublished')
    await payload.update({ collection: 'products', id: product.id, data: { status: 'ACTIVE' }, overrideAccess: true })
    expect(await live(product.id)).toMatchObject({ status: 'ACTIVE' })

    // Unpublish, as the admin's button does.
    await payload.update({ collection: 'products', id: product.id, data: { _status: 'draft' }, overrideAccess: true })
    expect(await live(product.id)).toMatchObject({ status: 'DRAFT', _status: 'draft' })
  })

  it("doesn't publish a draft when a variant or a review changes the product", async () => {
    const product = await publishedProduct('Busy')
    await payload.update({ collection: 'products', id: product.id, data: { name: `Draft name ${stamp}` }, draft: true, user: staff, overrideAccess: false })

    const variant = await payload.create({
      collection: 'product-variants',
      data: { product: product.id, sku: `DRAFT-${stamp}`, name: 'Standard', mrpPaise: 1000, sellingPricePaise: 900 },
      overrideAccess: true,
    })
    await payload.update({ collection: 'product-variants', id: variant.id, data: { name: 'Kit' }, overrideAccess: true })
    expect(await live(product.id)).toMatchObject({ name: `Busy ${stamp}`, _status: 'published' })

    const { rows } = await payload.db.drizzle.execute(sql`SELECT search_a FROM products WHERE id = ${product.id}`)
    expect(String(rows[0].search_a)).toContain(`DRAFT-${stamp}`)
  })
})
