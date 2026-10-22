import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { CatalogPage } from '@/components/catalog/CatalogPage'
import { getCategoryTree } from '@/lib/storefront/catalog'
import { parseListingParams } from '@/lib/storefront/listing-params'
import { getPayloadClient } from '@/lib/storefront/queries'

const getBrand = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'brands',
    where: { and: [{ slug: { equals: slug } }, { isActive: { not_equals: false } }] },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
})

export async function generateMetadata(props: PageProps<'/brand/[slug]'>): Promise<Metadata> {
  const brand = await getBrand((await props.params).slug)
  if (!brand) return {}
  return { title: `${brand.name} Power Tools`, description: brand.about || `Shop ${brand.name} tools online with GST invoice.` }
}

/** Everything from one brand, e.g. /brand/hcc, with the usual listing filters. */
export default async function BrandPage(props: PageProps<'/brand/[slug]'>) {
  const [{ slug }, raw] = await Promise.all([props.params, props.searchParams])
  const brand = await getBrand(slug)
  if (!brand) notFound()

  const payload = await getPayloadClient()
  const [products, tree] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { and: [{ brand: { equals: brand.id } }, { status: { equals: 'ACTIVE' } }] },
      pagination: false,
      depth: 0,
      select: { slug: true },
    }),
    getCategoryTree(),
  ])
  const topLevel = [...tree.bySlug.values()].filter((node) => node.parentId === undefined)
  const topSlugs = topLevel.map((node) => node.slug)
  const basePath = `/brand/${brand.slug}`

  return (
    <CatalogPage
      basePath={basePath}
      title={brand.name}
      banner={null}
      breadcrumbs={[{ label: 'All Products', href: '/products' }, { label: brand.name }]}
      scopeIds={null}
      productIds={products.docs.map((product) => product.id)}
      resolveSub={(slugs) =>
        slugs.flatMap((sub) => {
          const node = tree.bySlug.get(sub)
          return node ? tree.descendantIds(node.id) : []
        })
      }
      categoryFilter={{
        mode: 'filter',
        allLabel: 'All Categories',
        allHref: basePath,
        options: topLevel.map((node) => ({ slug: node.slug, name: node.name, href: `/category/${node.slug}` })),
        selected: parseListingParams(raw).sub.filter((sub) => topSlugs.includes(sub)),
      }}
      empty={{ heading: `No ${brand.name} products right now`, hint: 'Check back soon, or browse all products.' }}
      raw={raw}
    />
  )
}
