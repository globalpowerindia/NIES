import type { Payload, Where } from 'payload'

import type { ProductCardProps } from '@/components/product/ProductCard'
import { mediaOf } from '@/lib/storefront/content'
import type { Product, ProductVariant } from '@/payload-types'

export const PLACEHOLDER_IMAGE = '/products/sample-drill.png'

export const relId = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null | undefined)?.id

/** The variant a card prices from: the one marked default, else the first by sort order. */
export const pickVariant = (variants: ProductVariant[]): ProductVariant | undefined =>
  variants.find((variant) => variant.isDefault) ?? variants[0]

export type ProductPricing = { variant: ProductVariant; inStock: boolean }

/**
 * Price and stock for many products in two queries, not one per product.
 * Products with no active variant are left out: without a price they can't be bought.
 */
export const loadPricing = async (payload: Payload, ids: number[]): Promise<Map<number, ProductPricing>> => {
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
    if (row.allowBackorder || Number(row.onHand ?? 0) - Number(row.reserved ?? 0) > 0) sellable.add(productId)
  }

  for (const [productId, productVariants] of variantsByProduct) {
    const variant = pickVariant(productVariants)
    if (variant) pricing.set(productId, { variant, inStock: sellable.has(productId) })
  }
  return pricing
}

/** Builds cards for already-fetched products, keeping their order. */
export const toProductCards = async (payload: Payload, products: Product[]): Promise<ProductCardProps[]> => {
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
      },
    ]
  })
}

const ACTIVE: Where = { status: { equals: 'ACTIVE' } }

export type CarouselSource = 'new' | 'bestSeller' | 'offers' | 'category' | 'manual'

/** Resolves a homepage product carousel's rule into cards. */
export const getCarouselCards = async (
  payload: Payload,
  options: { source: CarouselSource; limit: number; categoryId?: number; productIds?: number[] },
): Promise<ProductCardProps[]> => {
  const { source, limit } = options

  if (source === 'manual') {
    const ids = options.productIds ?? []
    if (ids.length === 0) return []
    const found = await payload.find({
      collection: 'products',
      where: { and: [ACTIVE, { id: { in: ids } }] },
      limit: ids.length,
      depth: 1,
    })
    // Keep the order staff arranged, not the database's.
    const byId = new Map(found.docs.map((doc) => [doc.id, doc]))
    const ordered = ids.map((id) => byId.get(id)).filter((doc): doc is Product => Boolean(doc))
    return toProductCards(payload, ordered)
  }

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
    // "On offer" is decided by variant prices, so fetch a wider pool and trim after.
    limit: source === 'offers' ? limit * 4 : limit,
    sort: ['sortOrder', '-createdAt'],
    depth: 1,
  })

  const cards = await toProductCards(payload, found.docs)
  return source === 'offers'
    ? cards.filter((card) => card.mrpPaise && card.mrpPaise > card.pricePaise).slice(0, limit)
    : cards
}
