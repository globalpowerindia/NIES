import type { Metadata } from 'next'

import { CatalogPage } from '@/components/catalog/CatalogPage'
import { getCategoryTree } from '@/lib/storefront/catalog'
import { parseListingParams } from '@/lib/storefront/listing-params'

export const metadata: Metadata = {
  title: 'All Products',
  description: 'Power tools, machinery and accessories from leading brands, with GST invoice and fast delivery.',
}

export default async function AllProductsPage(props: PageProps<'/products'>) {
  const raw = await props.searchParams
  const tree = await getCategoryTree()
  const topLevel = [...tree.bySlug.values()].filter((node) => node.parentId === undefined)
  const topSlugs = topLevel.map((node) => node.slug)

  return (
    <CatalogPage
      basePath="/products"
      title="All Products"
      banner={null}
      breadcrumbs={[{ label: 'All Products' }]}
      scopeIds={null}
      resolveSub={(slugs) =>
        slugs.flatMap((slug) => {
          const node = tree.bySlug.get(slug)
          return node ? tree.descendantIds(node.id) : []
        })
      }
      categoryFilter={{
        mode: 'filter',
        allLabel: 'All Categories',
        allHref: '/products',
        options: topLevel.map((node) => ({ slug: node.slug, name: node.name, href: `/category/${node.slug}` })),
        selected: parseListingParams(raw).sub.filter((sub) => topSlugs.includes(sub)),
      }}
      raw={raw}
    />
  )
}
