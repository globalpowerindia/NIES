import type { Metadata } from 'next'

import { CatalogPage } from '@/components/catalog/CatalogPage'
import { getCategoryTree } from '@/lib/storefront/catalog'
import { parseListingParams } from '@/lib/storefront/listing-params'
import { offerProductIds } from '@/lib/storefront/products'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = {
  title: 'Offers',
  description: 'Power tools and machinery priced below MRP, with GST invoice.',
}

/** Everything on offer (priced below MRP): where the homepage offer strip and offer carousel lead. */
export default async function OffersPage(props: PageProps<'/offers'>) {
  const raw = await props.searchParams
  const [ids, tree] = await Promise.all([offerProductIds(await getPayloadClient(), 1000), getCategoryTree()])
  const topLevel = [...tree.bySlug.values()].filter((node) => node.parentId === undefined)
  const topSlugs = topLevel.map((node) => node.slug)

  return (
    <CatalogPage
      basePath="/offers"
      title="Offers"
      banner={null}
      breadcrumbs={[{ label: 'Offers' }]}
      scopeIds={null}
      productIds={ids}
      resolveSub={(slugs) =>
        slugs.flatMap((slug) => {
          const node = tree.bySlug.get(slug)
          return node ? tree.descendantIds(node.id) : []
        })
      }
      categoryFilter={{
        mode: 'filter',
        allLabel: 'All Categories',
        allHref: '/offers',
        options: topLevel.map((node) => ({ slug: node.slug, name: node.name, href: `/category/${node.slug}` })),
        selected: parseListingParams(raw).sub.filter((sub) => topSlugs.includes(sub)),
      }}
      empty={{ heading: 'No offers right now', hint: 'Check back soon, or browse all products.' }}
      raw={raw}
    />
  )
}
