import { readFileSync } from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'

import { toSlug } from '../fields/slug.js'
import { DEFAULT_GST_RATE_BPS } from '../lib/money.js'
import config from '../payload.config.js'

/**
 * Loads the client's catalogue into the store: brands, categories, spec
 * definitions, products with their specs, one variant each, and pictures
 * (uploaded through Payload, so they land in R2 when it is configured).
 *
 *   npm run import:catalogue -- <dir with catalogue.json and images/> [--dry-run]
 *
 * The JSON comes from scripts/catalogue/extract.py, which reads the
 * catalogue workbook. The workbook has no prices, so every product arrives
 * as a DRAFT priced at zero and stays off the storefront until priced and
 * published. Safe to re-run: products are matched by SKU and pictures by
 * filename, and a re-run never touches status, price or stock.
 */

type Spec = { label: string | null; value: string }
type Row = {
  sheet: string
  category: string
  brand: string
  model: string
  name: string
  sku: string
  specs: Spec[]
  images: string[]
  source: string
}
type Catalogue = { products: Row[]; parents: Record<string, string> }

/** Delivery charges per product series, in rupees, from the client's charges sheet (PRODUCT LIST_03). */
const DELIVERY: Record<string, [kerala: number, outOfState: number]> = {
  'Electric Drills': [300, 600],
  'Rotary Hammers': [300, 600],
  'Demolition Hammers': [300, 600],
  'Angle Grinders': [300, 600],
  'Marble Cutters': [300, 600],
  'Sanders & Polishers': [300, 600],
  'Wood Working Tools': [300, 600],
  'Other Power Tools': [300, 600],
  'Cordless Drills': [300, 600],
  'Cordless Rotary Hammers': [300, 600],
  'Cordless Impact Wrenches': [300, 600],
  'Cordless Cutting Tools': [300, 600],
  'Cordless Garden Tools': [300, 600],
  'Other Cordless Tools': [300, 600],
  'Domestic Pressure Washers': [600, 1200],
  'Semi-Commercial Pressure Washers': [800, 1600],
  'Heavy Duty Pressure Washers': [1200, 2000],
  'Make in India Pressure Washers': [1200, 2000],
  'MMA Welding Machines': [300, 600],
  'MIG Welding Machines': [800, 1600],
  'TIG Welding Machines': [800, 1600],
  'Plasma Cutters': [800, 1600],
  'Domestic Vacuum Cleaners': [300, 600],
  'Heavy Duty Vacuum Cleaners': [600, 1200],
  'Foaming Machines': [600, 1200],
  'Cleaning Equipment': [800, 1600],
  'Direct Drive Compressors': [600, 1200],
  'Oil Free Compressors': [600, 1200],
  'Belt Drive Compressors': [1200, 2000],
  'Engine Drive Compressors': [1200, 2000],
  // Screw drive compressors: no charge given in the sheet.
  'Diaphragm Sprayers': [600, 1200],
  'Piston Pump Sprayers': [800, 1600],
  'Engine Drive Sprayers': [1200, 2000],
  'Screw Pump Sprayers': [1200, 2000],
  'Brush Cutters': [600, 1200],
  'Chain Saws': [600, 1200],
  Engines: [600, 1200],
  'Water Pumps': [800, 1600],
  'Engine Sprayers': [1200, 2000],
  'Hydraulic Machines & Equipment': [800, 1600],
}

// A fresh context per call: the storage plugin keeps per-upload state on
// `req.context`, so one shared object would carry the first upload's state
// into the next and silently skip uploading its file.
const quiet = () => ({ context: { skipRevalidate: true } })
const specKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, next: string | undefined) => (next ? next.toUpperCase() : ''))
    .replace(/^[0-9]+/, '')

const main = async () => {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dir = args.find((arg) => !arg.startsWith('--'))
  if (!dir) throw new Error('Usage: npm run import:catalogue -- <dir> [--dry-run]')
  const catalogue = JSON.parse(readFileSync(path.join(dir, 'catalogue.json'), 'utf8')) as Catalogue

  const payload = await getPayload({ config })
  const counts = {
    brands: 0,
    categories: 0,
    specs: 0,
    media: 0,
    repaired: 0,
    created: 0,
    updated: 0,
  }

  const cache = new Map<string, number>()
  const once = async (
    key: string,
    find: () => Promise<number | undefined>,
    create: () => Promise<number>,
  ) => {
    if (cache.has(key)) return cache.get(key)!
    let id = await find()
    if (id === undefined && dryRun) {
      // Count what a real run would create, without creating it.
      const kind = key.split(':')[0] as 'brand' | 'category' | 'spec' | 'media'
      counts[
        ({ brand: 'brands', category: 'categories', spec: 'specs', media: 'media' } as const)[kind]
      ]++
      id = -1
    }
    id ??= await create()
    cache.set(key, id)
    return id
  }

  const brandId = (name: string) =>
    once(
      `brand:${name}`,
      async () =>
        (
          await payload.find({
            collection: 'brands',
            where: { name: { equals: name } },
            limit: 1,
            depth: 0,
          })
        ).docs[0]?.id,
      async () => {
        counts.brands++
        return (
          await payload.create({
            collection: 'brands',
            data: { name, slug: toSlug(name), isActive: true },
            ...quiet(),
          })
        ).id
      },
    )

  // New categories start hidden, so the storefront shows no empty aisles until products are published.
  const categoryId = (name: string, parent?: number) =>
    once(
      `category:${parent ?? 0}:${name}`,
      async () =>
        (
          await payload.find({
            collection: 'categories',
            where: {
              and: [
                { name: { equals: name } },
                parent ? { parent: { equals: parent } } : { parent: { exists: false } },
              ],
            },
            limit: 1,
            depth: 0,
          })
        ).docs[0]?.id,
      async () => {
        counts.categories++
        return (
          await payload.create({
            collection: 'categories',
            data: { name, slug: toSlug(name), parent, isActive: false },
            ...quiet(),
          })
        ).id
      },
    )

  const specId = (label: string) =>
    once(
      `spec:${specKey(label)}`,
      async () =>
        (
          await payload.find({
            collection: 'spec-definitions',
            where: { key: { equals: specKey(label) } },
            limit: 1,
            depth: 0,
          })
        ).docs[0]?.id,
      async () => {
        counts.specs++
        return (
          await payload.create({
            collection: 'spec-definitions',
            data: { key: specKey(label), label, type: 'TEXT', group: 'Specifications' },
            ...quiet(),
          })
        ).id
      },
    )

  const mediaId = (file: string, alt: string) =>
    once(
      `media:${file}`,
      async () => {
        const found = (
          await payload.find({
            collection: 'media',
            where: { filename: { equals: file } },
            limit: 1,
            depth: 0,
          })
        ).docs[0]
        // A record whose file never reached storage (an interrupted run) gets
        // the file uploaded again under the same id, so products keep their link.
        if (found?.url && !dryRun) {
          const served = await fetch(new URL(found.url, 'http://localhost:3000'), {
            method: 'HEAD',
          })
            .then((response) => response.ok)
            .catch(() => false)
          if (!served) {
            await payload.update({
              collection: 'media',
              id: found.id,
              data: { alt },
              filePath: path.join(dir, 'images', file),
              overwriteExistingFiles: true,
              ...quiet(),
            })
            counts.repaired++
          }
        }
        return found?.id
      },
      async () => {
        counts.media++
        return (
          await payload.create({
            collection: 'media',
            data: { alt },
            filePath: path.join(dir, 'images', file),
            ...quiet(),
          })
        ).id
      },
    )

  const usedSlugs = new Set<string>()
  for (const [index, row] of catalogue.products.entries()) {
    const parentId = await categoryId(catalogue.parents[row.category])
    const category = await categoryId(row.category, parentId)
    const brand = await brandId(row.brand)
    const images = []
    for (const file of row.images) images.push(await mediaId(file, row.name))
    const specValues = []
    for (const spec of row.specs) {
      if (!spec.label || !spec.value) continue
      specValues.push({ definition: await specId(spec.label), valueText: spec.value })
    }

    const existing = await payload.find({
      collection: 'product-variants',
      where: { sku: { equals: row.sku } },
      limit: 1,
      depth: 0,
    })
    const productData = {
      name: row.name,
      modelNumber: row.model,
      category,
      brand,
      images,
      specValues,
      shortDesc: row.specs
        .slice(0, 3)
        .map((spec) => spec.value)
        .join(' · ')
        .slice(0, 200),
    }

    if (dryRun) {
      existing.docs[0] ? counts.updated++ : counts.created++
    } else if (existing.docs[0]) {
      const productId =
        typeof existing.docs[0].product === 'number'
          ? existing.docs[0].product
          : existing.docs[0].product.id
      await payload.update({ collection: 'products', id: productId, data: productData, ...quiet() })
      counts.updated++
    } else {
      let slug = toSlug(row.name)
      const taken = async (candidate: string) =>
        usedSlugs.has(candidate) ||
        (await payload.count({ collection: 'products', where: { slug: { equals: candidate } } }))
          .totalDocs > 0
      if (await taken(slug)) slug = toSlug(`${row.name} ${row.sku}`)
      usedSlugs.add(slug)
      const product = await payload.create({
        collection: 'products',
        data: {
          ...productData,
          slug,
          status: 'DRAFT',
          // The store defaults, flagged for review: the workbook has no tax details.
          hsnCode: '8467',
          gstRateBps: DEFAULT_GST_RATE_BPS,
        },
        ...quiet(),
      })
      await payload.create({
        collection: 'product-variants',
        data: {
          product: product.id,
          sku: row.sku,
          name: 'Standard',
          mrpPaise: 0,
          sellingPricePaise: 0,
          isDefault: true,
          isActive: true,
        },
        ...quiet(),
      })
      counts.created++
    }
    if ((index + 1) % 25 === 0) console.log(`  ${index + 1} / ${catalogue.products.length}`)
  }

  let delivery = 0
  for (const [name, [kerala, outOfState]] of Object.entries(DELIVERY)) {
    const id = cache.get(
      [...cache.keys()].find(
        (key) =>
          key.startsWith('category:') && key.endsWith(`:${name}`) && !key.startsWith('category:0:'),
      ) ?? '',
    )
    if (!id || id < 0) continue
    if (!dryRun) {
      await payload.update({
        collection: 'categories',
        id,
        data: { deliveryKeralaPaise: kerala * 100, deliveryOutOfStatePaise: outOfState * 100 },
        ...quiet(),
      })
    }
    delivery++
  }

  console.log(dryRun ? 'DRY RUN — nothing was written.' : 'Import finished.')
  console.log(
    `Products: ${counts.created} new, ${counts.updated} updated · new brands ${counts.brands}, categories ${counts.categories}, spec types ${counts.specs}, pictures ${counts.media} (${counts.repaired} re-uploaded) · delivery charges set on ${delivery} categories`,
  )
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
