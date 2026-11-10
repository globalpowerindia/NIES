import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'
import { cache } from 'react'

import { loadShippingRates } from '@/lib/checkout'
import { COMPARE_MAX } from '@/lib/compare-rules'
import { invoiceSeller } from '@/lib/invoice/invoice-data'
import { summarizeReviewRatings } from '@/lib/review-ratings'
import { CACHE_VERSION, STOREFRONT_CACHE } from '@/lib/revalidate'
import { SPIN_MIN_FRAMES } from '@/lib/spin-rules'
import { fileUrlOf, mediaOf, type MediaInfo } from '@/lib/storefront/content'
import { getCarouselCards, loadPricing, PLACEHOLDER_IMAGE, relId } from '@/lib/storefront/products'
import { getPayloadClient } from '@/lib/storefront/queries'
import { youTubeId } from '@/lib/video'
import type { Brand, Category, Media, Product, ProductVariant, SpecDefinition } from '@/payload-types'

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

/**
 * One photo of a 360° view: the 768px copy for phones and the 1600px copy for
 * large screens. Copies Payload didn't make (the photo was smaller) fall back
 * to the original.
 */
export type SpinFrame = { src: string; large: string; width?: number; height?: number }

export type ProductSpinData = {
  frames: SpinFrame[]
  verticalFrames?: SpinFrame[]
  generated?: boolean
  autoRotate: boolean
  reverse: boolean
}

const spinFrameOf = (value: unknown): SpinFrame | null => {
  if (!value || typeof value !== 'object') return null
  const media = value as Media
  if (!media.url || !media.mimeType?.startsWith('image/')) return null
  return {
    src: media.sizes?.card?.url ?? media.url,
    large: media.sizes?.hero?.url ?? media.url,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  }
}

/** The 360° view, or null when there are too few photos for one (see SPIN_MIN_FRAMES). */
const spinOf = (product: Product): ProductSpinData | null => {
  const frames = (product.spin?.frames ?? []).map(spinFrameOf).filter((frame): frame is SpinFrame => frame !== null)
  return frames.length >= SPIN_MIN_FRAMES
    ? { frames, autoRotate: product.spin?.autoRotate !== false, reverse: product.spin?.reverse === true }
    : null
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

/** A product staff picked to go with this one, priced from the variant its card uses. */
export type BoughtTogetherItem = {
  productId: number
  variantId: number
  name: string
  href: string
  image: string
  pricePaise: number
  mrpPaise: number
  /** Can go in the cart: sold online and in stock. */
  buyable: boolean
}

/** Staff's picks, live and priced, in their order. */
const loadBoughtTogether = async (payload: Payload, product: Product): Promise<BoughtTogetherItem[]> => {
  const picks = (product.boughtTogether ?? []).filter(
    (entry): entry is Product =>
      typeof entry === 'object' && entry.status === 'ACTIVE' && entry._status !== 'draft' && entry.id !== product.id,
  )
  const pricing = await loadPricing(
    payload,
    picks.map((entry) => entry.id),
  )
  return picks.flatMap<BoughtTogetherItem>((entry) => {
    const priced = pricing.get(entry.id)
    if (!priced) return []
    return [
      {
        productId: entry.id,
        variantId: priced.variant.id,
        name: entry.name,
        href: `/products/${entry.slug}`,
        image: mediaOf(entry.images?.[0])?.url ?? PLACEHOLDER_IMAGE,
        pricePaise: priced.variant.sellingPricePaise,
        mrpPaise: priced.variant.mrpPaise,
        buyable: entry.sellOnline === true && priced.inStock && priced.variant.sellingPricePaise > 0,
      },
    ]
  })
}

export type ReviewCard = {
  id: number
  authorName: string
  rating: number
  title?: string | null
  body?: string | null
  verifiedPurchase: boolean
  date: string
  photos: MediaInfo[]
}

/** A section staff added to a product. Each kind has its own layout on the page. */
export type ContentSection = { id: string; heading: string } & (
  | { kind: 'table'; rows: { label: string; value: string }[] }
  | { kind: 'items'; items: { name: string; quantity?: string | null; image: MediaInfo | null }[] }
  | { kind: 'features'; items: string[] }
  | { kind: 'text'; body: unknown }
  | { kind: 'cards'; intro?: string | null; cards: { title: string; text?: string | null; image: MediaInfo | null }[] }
)

const contentSectionsOf = (product: Product): ContentSection[] =>
  (product.contentSections ?? []).map((block): ContentSection => {
    const base = { id: block.id ?? block.heading, heading: block.heading }
    switch (block.blockType) {
      case 'sectionTable':
        return { ...base, kind: 'table', rows: block.rows.map(({ label, value }) => ({ label, value })) }
      case 'sectionItems':
        return {
          ...base,
          kind: 'items',
          items: block.items.map((item) => ({ name: item.name, quantity: item.quantity, image: mediaOf(item.image) })),
        }
      case 'sectionFeatures':
        return { ...base, kind: 'features', items: block.items.map((item) => item.text) }
      case 'sectionText':
        return { ...base, kind: 'text', body: block.body }
      case 'sectionCards':
        return {
          ...base,
          kind: 'cards',
          intro: block.intro,
          cards: block.cards.map((card) => ({ title: card.title, text: card.text, image: mediaOf(card.image) })),
        }
    }
  })


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
      depth: 1,
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

  const [compare, boughtTogether] = await Promise.all([
    buildCompare(payload, product, defs),
    loadBoughtTogether(payload, product),
  ])

  return {
    product,
    variant: selected,
    options,
    inStock: sellableVariants.has(selected.id),
    images: images.length ? images : [{ url: PLACEHOLDER_IMAGE, alt: product.name }],
    modelUrl: product.model3d && typeof product.model3d === 'object' && product.model3d.mimeType === 'model/gltf-binary'
      ? `/api/models/${product.model3d.id}?v=${encodeURIComponent(product.model3d.updatedAt)}` : null,
    spin: spinOf(product),
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
      photos: (review.photos ?? []).map(mediaOf).filter((photo): photo is MediaInfo => photo !== null),
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
    supplierImages: (product.supplierImages ?? []).map(mediaOf).filter((media): media is MediaInfo => media !== null),
    contentSections: contentSectionsOf(product),
    faqs: (product.faqs ?? []).map(({ question, answer }) => ({ question, answer })),
    compare,
    boughtTogether,
  }
}

/** Cached per product and variant until the catalogue or its reviews change. */
export const getProductPage = cache(
  unstable_cache(loadProductPage, ['product-page', 'review-summary-v2', 'product-gallery-dense-spin-v1', 'content-sections-v7', 'bought-together-v2', CACHE_VERSION], STOREFRONT_CACHE),
)

export type ProductPageData = NonNullable<Awaited<ReturnType<typeof getProductPage>>>

/**
 * What every product page shows besides the product: delivery rates, whether
 * invoices can be issued, the catalogue counts and the best sellers. Cached together, and purged
 * by saves to products, Delivery & Checkout or Header & Footer.
 */
/** How many best sellers the product page shows. */
export const BEST_SELLER_LIMIT = 12

export const getProductPageContext = cache(
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const [rates, checkout, products, categories, brands, bestSellers] = await Promise.all([
        loadShippingRates(payload),
        payload.findGlobal({ slug: 'checkout-settings', depth: 0, overrideAccess: true }),
        payload.count({ collection: 'products', where: { status: { equals: 'ACTIVE' } } }),
        payload.count({ collection: 'categories' }),
        payload.count({ collection: 'brands' }),
        // One spare, as the page leaves out the product it's showing.
        getCarouselCards(payload, { source: 'bestSeller', limit: BEST_SELLER_LIMIT + 1 }),
      ])
      return {
        rates,
        hasInvoice: invoiceSeller(checkout) !== null,
        stats: { products: products.totalDocs, categories: categories.totalDocs, brands: brands.totalDocs },
        bestSellers,
      }
    },
    ['product-page-context', 'best-sellers-v1', CACHE_VERSION],
    STOREFRONT_CACHE,
  ),
)

export type Comparison = {
  columns: CompareColumn[]
  specLabels: string[]
  categoryId: number | null
  categoryName: string | null
  /** Asked-for products that were left out for being in another category. */
  dropped: boolean
}

const CATEGORY_LIMIT = 100

/** Columns and shared rows for these products, in the order given. */
const comparisonOf = async (
  payload: Payload,
  products: Product[],
  currentId: number | null,
  defs: Map<number, SpecDefinition>,
): Promise<Omit<Comparison, 'categoryName' | 'categoryId' | 'dropped'>> => {
  const pricing = await loadPricing(
    payload,
    products.map((entry) => entry.id),
  )

  const columns = products.flatMap<CompareColumn>((entry) => {
    const priced = pricing.get(entry.id)
    if (!priced) return []
    const brand = nameOf(entry.brand)
    const weight = formatWeight(priced.variant.weightGrams)
    // Two specs can share a label. They become one row, keeping the first value.
    const specs: Record<string, string> = {}
    for (const row of specRows(entry, defs, (def) => def.isCompare !== false)) {
      specs[row.label] ??= row.value
    }
    return [
      {
        productId: entry.id,
        inStock: priced.inStock,
        sellOnline: entry.sellOnline === true,
        href: `/products/${entry.slug}`,
        name: entry.name,
        image: mediaOf(entry.images?.[0])?.url ?? PLACEHOLDER_IMAGE,
        pricePaise: priced.variant.sellingPricePaise,
        isCurrent: entry.id === currentId,
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
        specs,
      },
    ]
  })

  // Rows in registry order, once each, and only specs at least one column has.
  const specLabels = [
    ...new Set(
      [...defs.values()]
        .filter((def) => def.isCompare !== false)
        .map((def) => def.label)
        .filter((label) => columns.some((column) => Object.hasOwn(column.specs, label))),
    ),
  ]

  return { columns, specLabels }
}

/**
 * This product plus the ones staff picked as similar, or else others from the
 * same category. Columns share rows only for specs flagged "show in compare".
 */
const buildCompare = async (
  payload: Payload,
  product: Product,
  defs: Map<number, SpecDefinition>,
): Promise<Comparison | null> => {
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
      limit: COMPARE_MAX - 1,
      depth: 1,
    })
    others = sameCategory.docs
  }
  others = others.slice(0, COMPARE_MAX - 1)
  if (others.length === 0) return null

  const { columns, specLabels } = await comparisonOf(payload, [product, ...others], product.id, defs)
  if (columns.length < 2) return null

  const category = typeof product.category === 'object' ? product.category : null
  return {
    columns,
    specLabels,
    categoryId: relId(product.category) ?? null,
    categoryName: category?.name ?? null,
    dropped: false,
  }
}

/** A shopper's own picks, in their order. All from the first product's category. */
export const loadComparison = async (ids: number[]): Promise<Comparison | null> => {
  const payload = await getPayloadClient()
  const [found, specDefs] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { and: [{ status: { equals: 'ACTIVE' } }, { id: { in: ids } }] },
      limit: ids.length,
      depth: 1,
    }),
    payload.find({ collection: 'spec-definitions', pagination: false, depth: 0, sort: 'sortOrder' }),
  ])
  const byId = new Map(found.docs.map((doc) => [doc.id, doc]))
  const products = ids.flatMap((id) => byId.get(id) ?? [])
  if (products.length === 0) return null

  const categoryId = relId(products[0].category) ?? null
  const sameCategory = products.filter((entry) => relId(entry.category) === categoryId)
  const category = products[0].category
  const defs = new Map(specDefs.docs.map((def) => [def.id, def]))
  const { columns, specLabels } = await comparisonOf(payload, sameCategory, null, defs)
  if (columns.length === 0) return null

  return {
    columns,
    specLabels,
    categoryId,
    categoryName: typeof category === 'object' && category ? category.name : null,
    dropped: sameCategory.length < products.length,
  }
}

export type CompareOption = { productId: number; name: string; image: string; pricePaise: number }

/** What a shopper can add to a comparison: everything live and priced in the category. */
export const loadCompareOptions = async (categoryId: number): Promise<CompareOption[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [{ status: { equals: 'ACTIVE' } }, { category: { equals: categoryId } }] },
    sort: 'name',
    limit: CATEGORY_LIMIT,
    depth: 1,
  })
  const pricing = await loadPricing(
    payload,
    docs.map((doc) => doc.id),
  )
  return docs.flatMap((doc) => {
    const priced = pricing.get(doc.id)
    return priced
      ? [
          {
            productId: doc.id,
            name: doc.name,
            image: mediaOf(doc.images?.[0])?.url ?? PLACEHOLDER_IMAGE,
            pricePaise: priced.variant.sellingPricePaise,
          },
        ]
      : []
  })
}
