import type { Metadata } from 'next'
import { getImageProps } from 'next/image'
import { notFound } from 'next/navigation'

import { Breadcrumbs, type Crumb } from '@/components/catalog/Breadcrumbs'
import { CompareTable } from '@/components/product-page/CompareTable'
import {
  Applications,
  FeatureBanners,
  SupplierBrochure,
} from '@/components/product-page/ProductExtras'
import { ProductGallery } from '@/components/product-page/ProductGallery'
import { ProductSummary } from '@/components/product-page/ProductSummary'
import { ProductTabs } from '@/components/product-page/ProductTabs'
import { ReviewsSection } from '@/components/product-page/ReviewsSection'
import { ProductMobileBack } from '@/components/product-page/ProductMobileBack'
import styles from '@/components/product-page/product-mobile.module.css'
import { TrackRecentlyViewed } from '@/components/sections/RecentlyViewed'
import { getDemandLine } from '@/lib/storefront/demand'
import { getProductPage, type ProductPageData } from '@/lib/storefront/product-page'

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

  const { product, category, parentCategory } = data
  const demand = await getDemandLine(
    product.id,
    product.sellOnline === true,
    product.pastUnitsSold ? { units: product.pastUnitsSold, since: product.pastSalesSince ?? null } : undefined,
  )
  const basePath = `/products/${product.slug}`
  const crumbs: Crumb[] = [
    ...(parentCategory
      ? [{ label: parentCategory.name, href: `/category/${parentCategory.slug}` }]
      : []),
    ...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []),
    { label: product.name },
  ]

  return (
    <main className={`${styles.page} bg-light-400 pb-6`}>
      <TrackRecentlyViewed productId={product.id} />
      <div className="container-page">
        <ProductMobileBack fallback={category ? `/category/${category.slug}` : '/products'} />
      </div>
      <div className="container-page flex flex-col gap-6 lg:pt-6">
        <div className="hidden lg:block">
          <Breadcrumbs items={crumbs} />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-[3.75rem]">
          <div className="w-full lg:sticky lg:top-6 lg:w-[53%] lg:max-w-[53.375rem]">
            <ProductGallery
              key={data.variant.id}
              productId={product.id}
              images={data.images}
              videos={data.videos}
              spin={data.spin}
              modelUrl={data.modelUrl}
              name={product.name}
              description={descriptionOf(data)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <ProductSummary key={data.variant.id} data={data} basePath={basePath} demand={demand} />
          </div>
        </div>

        <ProductTabs attributes={data.attributes} product={product} />
        <ReviewsSection
          data={data}
        />
        {data.brochure && <SupplierBrochure brochure={data.brochure} />}
        {data.compare && <CompareTable compare={data.compare} />}
        {data.applications.items.length > 0 && <Applications {...data.applications} />}
        {data.promoImages.length > 0 && <FeatureBanners images={data.promoImages} />}
      </div>
    </main>
  )
}
