import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { CatalogPage } from '@/components/catalog/CatalogPage'
import { getCategoryTree } from '@/lib/storefront/catalog'
import { parseListingParams, type SortKey } from '@/lib/storefront/listing-params'
import { getPayloadClient } from '@/lib/storefront/queries'
import { searchProducts } from '@/lib/storefront/search'

const SORT_OPTIONS: SortKey[] = ['relevance', 'newest', 'price-asc', 'price-desc', 'rating']

const queryOf = (raw: Record<string, string | string[] | undefined>): string => {
  const value = Array.isArray(raw.q) ? raw.q[0] : raw.q
  return (value ?? '').trim()
}

export async function generateMetadata(props: PageProps<'/search'>): Promise<Metadata> {
  const query = queryOf(await props.searchParams)
  return {
    title: query ? `Search: ${query}` : 'Search',
    // Result pages are thin, duplicated and infinite in number; none of them
    // belong in an index.
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage(props: PageProps<'/search'>) {
  const raw = await props.searchParams
  const query = queryOf(raw)
  const tree = await getCategoryTree()

  const payload = await getPayloadClient()
  const { ids, corrected, exactId } = query
    ? await searchProducts(payload, query)
    : { ids: [] as number[], corrected: false, exactId: null }

  // A pasted product code goes straight to the product — but only when the
  // shopper hasn't started filtering, since a redirect would throw that away.
  if (exactId && Object.keys(raw).length === 1) {
    const product = await payload.findByID({
      collection: 'products',
      id: exactId,
      depth: 0,
      disableErrors: true,
    })
    if (product?.slug) redirect(`/products/${product.slug}`)
  }

  const topLevel = [...tree.bySlug.values()].filter((node) => node.parentId === undefined)
  const topSlugs = topLevel.map((node) => node.slug)

  return (
    <CatalogPage
      basePath={`/search?q=${encodeURIComponent(query)}`}
      title={query ? `“${query}”` : 'Search'}
      banner={null}
      breadcrumbs={[{ label: 'Search' }]}
      scopeIds={null}
      // An empty query is not a search that found nothing, so it gets its own
      // copy rather than an id filter that would match everything.
      productIds={query ? ids : []}
      defaultSort="relevance"
      sortOptions={SORT_OPTIONS}
      resolveSub={(slugs) =>
        slugs.flatMap((slug) => {
          const node = tree.bySlug.get(slug)
          return node ? tree.descendantIds(node.id) : []
        })
      }
      categoryFilter={{
        mode: 'filter',
        allLabel: 'All Categories',
        allHref: `/search?q=${encodeURIComponent(query)}`,
        options: topLevel.map((node) => ({ slug: node.slug, name: node.name, href: `/category/${node.slug}` })),
        selected: parseListingParams(raw, 'relevance').sub.filter((sub) => topSlugs.includes(sub)),
      }}
      empty={
        query
          ? {
              heading: `No results for “${query}”`,
              hint: 'Check the spelling, try a shorter phrase, or search by model number.',
            }
          : { heading: 'What are you looking for?', hint: 'Search by product name, brand or model number.' }
      }
      notice={
        corrected ? (
          <p className="rounded-xl bg-brand-blue-100 px-4 py-3 text-body2 text-dark-400">
            No exact matches for <span className="font-medium text-dark-500">“{query}”</span> — showing the closest
            products instead.
          </p>
        ) : null
      }
      raw={raw}
    />
  )
}
