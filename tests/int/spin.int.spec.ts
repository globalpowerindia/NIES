import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Category, Product } from '@/payload-types'

/** The 360° view as staff build it: photos uploaded in any order, saved on a product. */

let payload: Payload
const stamp = Date.now()
const cleanup: { collection: 'media' | 'products' | 'categories'; id: number }[] = []

/** A plain square photo; `shade` makes each frame a distinct file. */
const photo = async (name: string, shade: number, size = 64) => {
  const data = await sharp({ create: { width: size, height: size, channels: 3, background: { r: shade, g: 120, b: 200 } } }).png().toBuffer()
  const doc = await payload.create({
    collection: 'media',
    data: { alt: name },
    file: { data, mimetype: 'image/png', name: `${name}-${stamp}.png`, size: data.length },
    overrideAccess: true,
  })
  cleanup.push({ collection: 'media', id: doc.id })
  return doc
}

const frameIds = async (productId: number) => {
  const product = await payload.findByID({ collection: 'products', id: productId, depth: 0, overrideAccess: true })
  return (product.spin?.frames ?? []) as number[]
}

let product: Product

describe('Product 360° view', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const category = await payload.create({ collection: 'categories', data: { name: `Spin ${stamp}` } as Category, overrideAccess: true })
    cleanup.push({ collection: 'categories', id: category.id })
    product = await payload.create({
      collection: 'products',
      data: { name: `Spin drill ${stamp}`, status: 'DRAFT', category: category.id, hsnCode: '8467', gstRateBps: 1800 } as Product,
      overrideAccess: true,
    })
    cleanup.push({ collection: 'products', id: product.id })
  })

  afterAll(async () => {
    for (const { collection, id } of cleanup.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('puts photos uploaded in any order into file-name order', async () => {
    const shots = []
    for (const n of [3, 1, 10, 2, 8, 5, 4, 9, 6, 7]) shots.push(await photo(`turn-${n}`, n * 20))
    await payload.update({ collection: 'products', id: product.id, data: { spin: { frames: shots.map((shot) => shot.id) } }, overrideAccess: true })

    const byName = [...shots].sort((a, b) => a.filename!.localeCompare(b.filename!, undefined, { numeric: true })).map((shot) => shot.id)
    expect(await frameIds(product.id)).toEqual(byName)
  })

  it('keeps a deliberate reorder of the same photos', async () => {
    const current = await frameIds(product.id)
    const reordered = [...current.slice(1), current[0]]
    await payload.update({ collection: 'products', id: product.id, data: { spin: { frames: reordered } }, overrideAccess: true })
    expect(await frameIds(product.id)).toEqual(reordered)
  })

  it('refuses too few photos, or one of a different size, and keeps what was saved', async () => {
    const before = await frameIds(product.id)
    await expect(
      payload.update({ collection: 'products', id: product.id, data: { spin: { frames: before.slice(0, 3) } }, overrideAccess: true }),
    ).rejects.toThrow(/at least 8/)

    const odd = await photo('turn-odd', 250, 96)
    await expect(
      payload.update({ collection: 'products', id: product.id, data: { spin: { frames: [...before, odd.id] } }, overrideAccess: true }),
    ).rejects.toThrow(/same size/)
    expect(await frameIds(product.id)).toEqual(before)
  })

  it('can be removed by clearing the photos', async () => {
    await payload.update({ collection: 'products', id: product.id, data: { spin: { frames: [] } }, overrideAccess: true })
    expect(await frameIds(product.id)).toEqual([])
  })
})
