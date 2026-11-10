import type { Metadata } from 'next'
import { getImageProps } from 'next/image'
import { notFound } from 'next/navigation'

import { ProductDetail } from '@/components/product-page/ProductDetail'
import { TrackRecentlyViewed } from '@/components/sections/RecentlyViewed'
import { mediaOf } from '@/lib/storefront/content'
import { getDemandLine } from '@/lib/storefront/demand'
import {
  getProductPage,
  getProductPageContext,
  type ProductPageData,
} from '@/lib/storefront/product-page'
import { getSiteSettings } from '@/lib/storefront/queries'

const variantParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/** What search results and shared links say about the product. Never empty. */
const descriptionOf = ({ product, brandName }: ProductPageData) =>
  product.metaDescription ||
  product.shortDesc ||
  product.subtitle ||
  `Shop ${product.name}${brandName ? ` by ${brandName}` : ''}.`

/**
 * A 1200px copy for link previews: WhatsApp and others drop an image that's too
 * heavy, and uploads can run to several MB. 600 asks for 1200, the 2x copy.
 */
const previewImageUrl = (src: string) =>
  getImageProps({ src, alt: '', width: 600, height: 600 }).props.src

export async function generateMetadata(props: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const [{ slug }, search] = await Promise.all([props.params, props.searchParams])
  const data = await getProductPage(slug, variantParam(search.variant))
  if (!data) return {}
  const { product, images } = data
  return {
    title: product.metaTitle || product.name,
    description: descriptionOf(data),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      url: `/products/${product.slug}`,
      images: images
        .slice(0, 1)
        .map((image) => ({ url: previewImageUrl(image.url), alt: image.alt || product.name })),
    },
  }
}

export default async function ProductPage(props: PageProps<'/products/[slug]'>) {
  const [{ slug }, search] = await Promise.all([props.params, props.searchParams])
  const data = await getProductPage(slug, variantParam(search.variant))
  if (!data) notFound()

  const { product } = data
  const [demand, context, settings] = await Promise.all([
    getDemandLine(
      product.id,
      product.sellOnline === true,
      product.pastUnitsSold ? { units: product.pastUnitsSold, since: product.pastSalesSince ?? null } : undefined,
    ),
    getProductPageContext(),
    getSiteSettings(),
  ])

  return (
    <>
      <TrackRecentlyViewed productId={product.id} />
      <ProductDetail
        data={data}
        demand={demand}
        rates={context.rates}
        hasInvoice={context.hasInvoice}
        stats={context.stats}
        bestSellers={context.bestSellers}
        tollFreeNumber={settings.tollFreeNumber}
        siteName={settings.siteName}
        logoUrl={mediaOf(settings.logo)?.url ?? null}
        pageSettings={settings.productPage}
        galleryDescription={descriptionOf(data)}
      />
    </>
  )
}
