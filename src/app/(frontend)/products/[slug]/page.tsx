import type { Metadata } from 'next'
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
import { getProductPage } from '@/lib/storefront/product-page'

const variantParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export async function generateMetadata(props: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const [{ slug }, search] = await Promise.all([props.params, props.searchParams])
  const data = await getProductPage(slug, variantParam(search.variant))
  if (!data) return {}
  const { product, images } = data
  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.shortDesc || product.subtitle || undefined,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      images: images
        .slice(0, 1)
        .map((image) => ({ url: image.url, alt: image.alt || product.name })),
    },
  }
}

export default async function ProductPage(props: PageProps<'/products/[slug]'>) {
  const [{ slug }, search] = await Promise.all([props.params, props.searchParams])
  const data = await getProductPage(slug, variantParam(search.variant))
  if (!data) notFound()

  const { product, category, parentCategory } = data
  const basePath = `/products/${product.slug}`
  const crumbs: Crumb[] = [
    ...(parentCategory
      ? [{ label: parentCategory.name, href: `/category/${parentCategory.slug}` }]
      : []),
    ...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []),
    { label: product.name },
  ]

  const sections = [
    { id: 'reviews', label: 'Reviews' },
    ...(data.brochure ? [{ id: 'supplier-description', label: 'Description' }] : []),
    ...(data.compare ? [{ id: 'compare', label: 'Similar Product Comparison' }] : []),
    ...(data.applications.items.length
      ? [{ id: 'applications', label: data.applications.title }]
      : []),
  ]

  return (
    <main className="bg-light-400 pb-6">
      <div className="container-page flex flex-col gap-6 pt-6">
        <Breadcrumbs items={crumbs} />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-[60px]">
          <div className="w-full lg:sticky lg:top-6 lg:w-[53%] lg:max-w-[854px]">
            <ProductGallery
              productId={product.id}
              images={data.images}
              videos={data.videos}
              name={product.name}
            />
          </div>
          <div className="min-w-0 flex-1">
            <ProductSummary data={data} basePath={basePath} />
          </div>
        </div>

        <ProductTabs attributes={data.attributes} sections={sections} />
        <ReviewsSection
          data={data}
          loginHref={`/login?next=${encodeURIComponent(`${basePath}#reviews`)}`}
        />
        {data.brochure && <SupplierBrochure brochure={data.brochure} />}
        {data.compare && <CompareTable compare={data.compare} />}
        {data.applications.items.length > 0 && <Applications {...data.applications} />}
        {data.promoImages.length > 0 && <FeatureBanners images={data.promoImages} />}
      </div>
    </main>
  )
}
