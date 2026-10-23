import { sql } from 'drizzle-orm'
import type { Payload, Where } from 'payload'

import type { ProductCardProps } from '@/components/product/ProductCard'
import { mediaOf } from '@/lib/storefront/content'
import type { Product, ProductVariant } from '@/payload-types'

export const PLACEHOLDER_IMAGE = '/products/sample-drill.png'

import { relId } from '@/lib/relations'

export { relId }

/** The variant a card prices from: the one marked default, else the first by sort order. */
export const pickVariant = (variants: ProductVariant[]): ProductVariant | undefined =>
  variants.find((variant) => variant.isDefault) ?? variants[0]

export type ProductPricing = { variant: ProductVariant; inStock: boolean }

/**
 * Price and stock for many products in two queries, not one per product.
 * Products with no active variant are left out: without a price they can't be bought.
 */
export const loadPricing = async (
  payload: Payload,
  ids: number[],
): Promise<Map<number, ProductPricing>> => {
  const pricing = new Map<number, ProductPricing>()
  if (ids.length === 0) return pricing

  const [variants, stock] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { and: [{ product: { in: ids } }, { isActive: { equals: true } }] },
      sort: 'sortOrder',
      pagination: false,
      depth: 0,
    }),
    payload.find({
      collection: 'inventory',
      where: { product: { in: ids } },
      pagination: false,
      depth: 0,
      select: { product: true, onHand: true, reserved: true, allowBackorder: true },
    }),
  ])

  const variantsByProduct = new Map<number, ProductVariant[]>()
  for (const variant of variants.docs) {
    const productId = relId(variant.product)
    if (productId === undefined) continue
    variantsByProduct.set(productId, [...(variantsByProduct.get(productId) ?? []), variant])
  }

  const sellable = new Set<number>()
  for (const row of stock.docs) {
    const productId = relId(row.product)
    if (productId === undefined) continue
    if (row.allowBackorder || Number(row.onHand ?? 0) - Number(row.reserved ?? 0) > 0)
      sellable.add(productId)
  }

  for (const [productId, productVariants] of variantsByProduct) {
    const variant = pickVariant(productVariants)
    if (variant) pricing.set(productId, { variant, inStock: sellable.has(productId) })
  }
  return pricing
}

/** Builds cards for already-fetched products, keeping their order. */
export const toProductCards = async (
  payload: Payload,
  products: Product[],
): Promise<ProductCardProps[]> => {
  const pricing = await loadPricing(
    payload,
    products.map((product) => product.id),
  )

  return products.flatMap((product) => {
    const { variant, inStock } = pricing.get(product.id) ?? {}
    if (!variant) return []
    const image = mediaOf(product.images?.[0])
    const category = typeof product.category === 'object' ? product.category?.name : undefined
    return [
      {
        productId: product.id,
        href: `/products/${product.slug}`,
        imageUrl: image?.url ?? PLACEHOLDER_IMAGE,
        imageAlt: image?.alt || product.name,
        label: product.name,
        category: category ?? '',
        pricePaise: variant.sellingPricePaise,
        mrpPaise: variant.mrpPaise,
        rating: product.ratingCount ? Number(product.ratingAvg ?? 0) / 100 : undefined,
        badge: product.badges?.includes('BEST_SELLER')
          ? 'bestSeller'
          : product.badges?.includes('NEW')
            ? 'new'
            : undefined,
        inStock,
        sellOnline: product.sellOnline === true,
      },
    ]
  })
}

const ACTIVE: Where = { status: { equals: 'ACTIVE' } }

export type CarouselSource = 'new' | 'bestSeller' | 'offers' | 'category' | 'manual'

/** Cards for these products, in this order, skipping any no longer active. */
const cardsInOrder = async (payload: Payload, ids: number[]): Promise<ProductCardProps[]> => {
  if (ids.length === 0) return []
  const found = await payload.find({
    collection: 'products',
    where: { and: [ACTIVE, { id: { in: ids } }] },
    limit: ids.length,
    depth: 1,
  })
  const byId = new Map(found.docs.map((doc) => [doc.id, doc]))
  const ordered = ids.map((id) => byId.get(id)).filter((doc): doc is Product => Boolean(doc))
  return toProductCards(payload, ordered)
}

/**
 * Active products whose card price is below MRP, best placed first. The card
 * prices from the default variant (else the first by sort order, as
 * `pickVariant`), so that is the variant that has to be discounted.
 */
/** Active products whose price is below MRP. Also the /offers listing. */
export const offerProductIds = async (payload: Payload, limit: number): Promise<number[]> => {
  const result = await payload.db.drizzle.execute(sql`
    SELECT p.id
    FROM products p
    JOIN LATERAL (
      SELECT pv.selling_price_paise, pv.mrp_paise
      FROM product_variants pv
      WHERE pv.product_id = p.id AND pv.is_active IS TRUE
      ORDER BY pv.is_default IS TRUE DESC, pv.sort_order ASC NULLS LAST, pv.id
      LIMIT 1
    ) v ON TRUE
    WHERE p.status = 'ACTIVE' AND v.mrp_paise > v.selling_price_paise
    ORDER BY p.sort_order ASC NULLS LAST, p.created_at DESC
    LIMIT ${limit}
  `)
  return result.rows.map((row) => Number(row.id))
}

/** Resolves a homepage product carousel's rule into cards. */
export const getCarouselCards = async (
  payload: Payload,
  options: { source: CarouselSource; limit: number; categoryId?: number; productIds?: number[] },
): Promise<ProductCardProps[]> => {
  const { source, limit } = options

  // Keep the order staff arranged, not the database's.
  if (source === 'manual') return cardsInOrder(payload, options.productIds ?? [])

  // "On offer" depends on variant prices, so it is chosen in SQL; picking from
  // a pool of newest products first could miss every discounted one.
  if (source === 'offers') return cardsInOrder(payload, await offerProductIds(payload, limit))

  const filter: Where | undefined =
    source === 'new'
      ? { badges: { in: ['NEW'] } }
      : source === 'bestSeller'
        ? { badges: { in: ['BEST_SELLER'] } }
        : source === 'category' && options.categoryId
          ? { category: { equals: options.categoryId } }
          : undefined

  const found = await payload.find({
    collection: 'products',
    where: filter ? { and: [ACTIVE, filter] } : ACTIVE,
    limit,
    sort: ['sortOrder', '-createdAt'],
    depth: 1,
  })
  return toProductCards(payload, found.docs)
}
