import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'
import { cache } from 'react'

import { summarizeReviewRatings } from '@/lib/review-ratings'
import { CACHE_VERSION, STOREFRONT_CACHE } from '@/lib/revalidate'
import { fileUrlOf, mediaOf, type MediaInfo } from '@/lib/storefront/content'
import { loadPricing, PLACEHOLDER_IMAGE, relId } from '@/lib/storefront/products'
import { getPayloadClient } from '@/lib/storefront/queries'
import { youTubeId } from '@/lib/video'
import type { Brand, Category, Product, ProductVariant, SpecDefinition } from '@/payload-types'

type SpecEntry = NonNullable<Product['specValues']>[number]

export type SpecRow = { key: string; label: string; value: string }

/** Numbers are stored x100 so ranges can be filtered; show them the way they were typed. */
export const formatSpec = (entry: SpecEntry, def: SpecDefinition): string | null => {
  if (def.type === 'BOOLEAN') return typeof entry.valueBool === 'boolean' ? (entry.valueBool ? 'Yes' : 'No') : null
  if (def.type === 'NUMBER' && typeof entry.valueNum === 'number') {
    const amount = (entry.valueNum / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
    return def.unit ? `${amount}${def.unit}` : amount
  }
  return entry.valueText?.trim() || null
}

const specRows = (product: Product, defs: Map<number, SpecDefinition>, include: (def: SpecDefinition) => boolean) =>
  (product.specValues ?? [])
    .flatMap((entry) => {
      const def = defs.get(relId(entry.definition) ?? -1)
      if (!def || !include(def)) return []
      const value = formatSpec(entry, def)
      return value ? [{ def, row: { key: def.key, label: def.label, value } }] : []
    })
    .sort((a, b) => Number(a.def.sortOrder ?? 0) - Number(b.def.sortOrder ?? 0))
    .map(({ row }) => row)

const nameOf = (value: unknown) => (value && typeof value === 'object' ? (value as Brand | Category).name : undefined)

const formatWeight = (grams?: number | null) =>
  grams ? `${(grams / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg` : undefined

export type VariantOption = {
  sku: string
  name: string
  pricePaise: number
  mrpPaise: number
  inStock: boolean
}

/** A product video for the gallery: a YouTube embed or an uploaded file. */
export type GalleryVideo =
  | { kind: 'youtube'; id: string; title: string }
  | { kind: 'file'; url: string; mimeType: string; title: string }

export type CompareColumn = {
  productId: number
  inStock: boolean
  sellOnline: boolean
  href: string
  name: string
  image: string
  pricePaise: number
  isCurrent: boolean
  basics: { label: string; value: string; isRating?: boolean }[]
  /** Spec value by label. A plain object, not a Map, so the page data can be cached. */
  specs: Record<string, string>
}

export type ReviewCard = {
  id: number
  authorName: string
  rating: number
  title?: string | null
  body?: string | null
  verifiedPurchase: boolean
  date: string
}

const COMPARE_LIMIT = 6

const loadProductPage = async (slug: string, variantSku?: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'ACTIVE' } }] },
    limit: 1,
    depth: 2,
  })
  const product = docs[0]
  if (!product) return null

  const [variants, stock, specDefs, reviews, ratings] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { and: [{ product: { equals: product.id } }, { isActive: { equals: true } }] },
      sort: 'sortOrder',
      pagination: false,
      depth: 1,
    }),
    payload.find({
      collection: 'inventory',
      where: { product: { equals: product.id } },
      pagination: false,
      depth: 0,
      select: { variant: true, onHand: true, reserved: true, allowBackorder: true },
    }),
    payload.find({ collection: 'spec-definitions', pagination: false, depth: 0, sort: 'sortOrder' }),
    payload.find({
      collection: 'reviews',
      where: { and: [{ product: { equals: product.id } }, { status: { equals: 'APPROVED' } }] },
      sort: '-createdAt',
      limit: 8,
      depth: 0,
    }),
    payload.find({
      collection: 'reviews',
      where: { and: [{ product: { equals: product.id } }, { status: { equals: 'APPROVED' } }] },
      pagination: false,
      depth: 0,
      select: { rating: true },
    }),
  ])
  if (variants.docs.length === 0) return null

  const sellableVariants = new Set(
    stock.docs
      .filter((row) => row.allowBackorder || Number(row.onHand ?? 0) - Number(row.reserved ?? 0) > 0)
      .map((row) => relId(row.variant)),
  )
  const options: VariantOption[] = variants.docs.map((variant) => ({
    sku: variant.sku,
    name: variant.name,
    pricePaise: variant.sellingPricePaise,
    mrpPaise: variant.mrpPaise,
    inStock: sellableVariants.has(variant.id),
  }))
  const selected: ProductVariant =
    variants.docs.find((variant) => variant.sku === variantSku) ??
    variants.docs.find((variant) => variant.isDefault) ??
    variants.docs[0]

  const defs = new Map(specDefs.docs.map((def) => [def.id, def]))

  // A variant's own photos come first when it has them.
  const images = [...(selected.images ?? []), ...(product.images ?? [])]
    .map(mediaOf)
    .filter((media): media is MediaInfo => media !== null)
    .filter((media, index, all) => all.findIndex((other) => other.url === media.url) === index)

  const category = typeof product.category === 'object' ? product.category : null
  const parentCategory = category && typeof category.parent === 'object' ? category.parent : null
  const brandName = nameOf(product.brand)

  const allSpecs = specRows(product, defs, () => true)
  const attributes: SpecRow[] = [
    { key: 'name', label: 'Product Name', value: product.name },
    ...(product.modelNumber ? [{ key: 'model', label: 'Model', value: product.modelNumber }] : []),
    ...(brandName ? [{ key: 'brand', label: 'Brand', value: brandName }] : []),
    ...(category ? [{ key: 'type', label: 'Product Type', value: category.name }] : []),
    ...allSpecs,
    ...(formatWeight(selected.weightGrams) ? [{ key: 'weight', label: 'Weight', value: formatWeight(selected.weightGrams)! }] : []),
    ...(product.warrantyMonths ? [{ key: 'warranty', label: 'Warranty', value: `${product.warrantyMonths} Months` }] : []),
    ...(product.countryOfOrigin ? [{ key: 'origin', label: 'Country of Origin', value: product.countryOfOrigin }] : []),
  ]

  const rating = summarizeReviewRatings(ratings.docs)

  const compare = await buildCompare(payload, product, defs)

  return {
    product,
    variant: selected,
    options,
    inStock: sellableVariants.has(selected.id),
    images: images.length ? images : [{ url: PLACEHOLDER_IMAGE, alt: product.name }],
    videos: (product.videos ?? []).flatMap<GalleryVideo>((video) => {
      const title = video.title || product.name
      if (video.source === 'youtube') {
        const id = youTubeId(video.url ?? '')
        return id ? [{ kind: 'youtube', id, title }] : []
      }
      const file = video.file
      return file && typeof file === 'object' && file.url
        ? [{ kind: 'file', url: file.url, mimeType: file.mimeType ?? 'video/mp4', title }]
        : []
    }),
    brandName,
    category,
    parentCategory,
    summarySpecs: specRows(product, defs, (def) => Boolean(def.isSummary)),
    attributes,
    rating,
    reviews: reviews.docs.map<ReviewCard>((review) => ({
      id: review.id,
      authorName: review.authorName,
      rating: Number(review.rating),
      title: review.title,
      body: review.body,
      verifiedPurchase: Boolean(review.verifiedPurchase),
      date: review.createdAt,
    })),
    accessories: (product.freeAccessories ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      image: mediaOf(item.image),
    })),
    userManualUrl: fileUrlOf(product.userManual),
    brochure: mediaOf(product.brochureBanner)
      ? { image: mediaOf(product.brochureBanner)!, fileUrl: fileUrlOf(product.datasheet) }
      : null,
    applications: {
      title: product.applications?.title || 'Applications',
      items: (product.applications?.items ?? []).flatMap((item) => {
        const image = mediaOf(item.image)
        return image ? [{ label: item.label, image }] : []
      }),
    },
    promoImages: (product.promoImages ?? []).map(mediaOf).filter((media): media is MediaInfo => media !== null),
    compare,
  }
}

/** Cached per product and variant until the catalogue or its reviews change. */
export const getProductPage = cache(
  unstable_cache(loadProductPage, ['product-page', 'review-summary-v2', CACHE_VERSION], STOREFRONT_CACHE),
)

export type ProductPageData = NonNullable<Awaited<ReturnType<typeof getProductPage>>>

/**
 * This product plus the ones staff picked as similar, or else others from the
 * same category. Columns share rows only for specs flagged "show in compare".
 */
const buildCompare = async (payload: Payload, product: Product, defs: Map<number, SpecDefinition>) => {
  let others = (product.similarProducts ?? []).filter(
    (entry): entry is Product => typeof entry === 'object' && entry.status === 'ACTIVE',
  )
  if (others.length === 0) {
    const sameCategory = await payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'ACTIVE' } },
          { category: { equals: relId(product.category) } },
          { id: { not_equals: product.id } },
        ],
      },
      sort: ['sortOrder', '-createdAt'],
      limit: COMPARE_LIMIT - 1,
      depth: 1,
    })
    others = sameCategory.docs
  }
  others = others.slice(0, COMPARE_LIMIT - 1)
  if (others.length === 0) return null

  const all = [product, ...others]
  const pricing = await loadPricing(
    payload,
    all.map((entry) => entry.id),
  )

  const columns = all.flatMap<CompareColumn>((entry) => {
    const priced = pricing.get(entry.id)
    if (!priced) return []
    const brand = nameOf(entry.brand)
    const weight = formatWeight(priced.variant.weightGrams)
    return [
      {
        productId: entry.id,
        inStock: priced.inStock,
        sellOnline: entry.sellOnline === true,
        href: `/products/${entry.slug}`,
        name: entry.name,
        image: mediaOf(entry.images?.[0])?.url ?? PLACEHOLDER_IMAGE,
        pricePaise: priced.variant.sellingPricePaise,
        isCurrent: entry.id === product.id,
        basics: [
          { label: 'Model', value: entry.modelNumber || '—' },
          { label: 'Brand', value: brand ?? '—' },
          { label: 'Weight', value: weight ?? '—' },
          entry.ratingCount
            ? { label: 'Rating', value: (Number(entry.ratingAvg ?? 0) / 100).toFixed(1), isRating: true }
            : { label: 'Rating', value: 'No reviews yet' },
          {
            label: 'Availability',
            value: entry.sellOnline !== true ? 'On enquiry' : priced.inStock ? 'In Stock' : 'Out Of Stock',
          },
        ],
        specs: Object.fromEntries(
          specRows(entry, defs, (def) => def.isCompare !== false).map((row) => [row.label, row.value]),
        ),
      },
    ]
  })
  if (columns.length < 2) return null

  // Rows in registry order, and only specs at least one column has.
  const specLabels = [...defs.values()]
    .filter((def) => def.isCompare !== false)
    .map((def) => def.label)
    .filter((label) => columns.some((column) => Object.hasOwn(column.specs, label)))

  return { columns, specLabels }
}
