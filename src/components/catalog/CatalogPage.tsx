import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ProductCard } from '@/components/product/ProductCard'
import { getListing } from '@/lib/storefront/catalog'
import type { MediaInfo } from '@/lib/storefront/content'
import { parseListingParams, withParam, type RawParams, type SortKey } from '@/lib/storefront/listing-params'
import { getPayloadClient } from '@/lib/storefront/queries'

import { Breadcrumbs, type Crumb } from './Breadcrumbs'
import { CatalogFilters, type CategoryFilter } from './CatalogFilters'
import { Pagination } from './Pagination'
import { SortMenu } from './SortMenu'

type Props = {
  basePath: string
  title: string
  banner: MediaInfo | null
  breadcrumbs: Crumb[]
  /** Categories in scope before `?sub=` narrows them; null lists everything. */
  scopeIds: number[] | null
  /** Resolves `?sub=` slugs to category ids (with descendants), or null if the page ignores `sub`. */
  resolveSub: ((slugs: string[]) => number[]) | null
  categoryFilter: CategoryFilter | null
  raw: RawParams
  /** Search passes its ranked matches; an empty array means "nothing matched". */
  productIds?: number[] | null
  defaultSort?: SortKey
  sortOptions?: SortKey[]
  /** Replaces the "no products match these filters" copy when the page has its own. */
  empty?: { heading: string; hint: string } | null
  /** Rendered above the grid — search uses it for the "showing results for" note. */
  notice?: ReactNode
}

export const CatalogPage = async ({
  basePath,
  title,
  banner,
  breadcrumbs,
  scopeIds,
  resolveSub,
  categoryFilter,
  raw,
  productIds = null,
  defaultSort = 'popularity',
  sortOptions,
  empty = null,
  notice = null,
}: Props) => {
  const params = parseListingParams(raw, defaultSort)
  const narrowed = resolveSub && params.sub.length ? resolveSub(params.sub) : null
  const payload = await getPayloadClient()
  const listing = await getListing(payload, {
    categoryIds: narrowed?.length ? narrowed : scopeIds,
    params,
    productIds,
  })
  const filtersActive =
    params.sub.length > 0 ||
    params.brands.length > 0 ||
    params.minRupees !== undefined ||
    params.maxRupees !== undefined ||
    params.inStock ||
    Object.keys(params.specs).length > 0

  return (
    <main className="bg-light-400 pb-6">
      <div className="container-page flex flex-col gap-6 pt-6">
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-brand-blue-500 sm:h-[300px]">
          {banner && (
            <Image
              src={banner.url}
              alt=""
              fill
              priority
              sizes="(max-width: 1652px) 100vw, 1620px"
              className="object-cover object-bottom"
            />
          )}
          <h1 className="relative px-4 text-center text-h5 font-semibold text-light-100 sm:text-h3">{title}</h1>
        </div>

        <Breadcrumbs items={breadcrumbs} />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-7">
          <aside className="w-full shrink-0 lg:w-[346px]">
            <CatalogFilters
              categories={categoryFilter}
              brands={listing.facets.brands}
              specs={listing.facets.specs}
              price={listing.facets.price}
              current={{
                minRupees: params.minRupees,
                maxRupees: params.maxRupees,
                inStock: params.inStock,
                brands: params.brands,
                specs: params.specs,
              }}
            />
          </aside>

          <section aria-label="Products" className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="p-1 text-body1 font-medium text-dark-300 sm:text-h6">
                Results for <span className="font-semibold text-dark-500">{title}</span>
                <span className="ml-2 text-body3 font-normal text-dark-300">({listing.total})</span>
              </p>
              <SortMenu value={params.sort} options={sortOptions} defaultSort={defaultSort} />
            </div>

            {notice}

            {listing.cards.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {listing.cards.map((card) => (
                  <li key={card.href} className="flex">
                    <ProductCard {...card} className="w-full" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-light-100 px-6 py-20 text-center">
                <p className="text-h6 font-medium text-dark-500">
                  {empty?.heading ?? 'No products match these filters'}
                </p>
                <p className="text-body2 text-dark-300">
                  {empty?.hint ?? 'Try removing a filter or widening the price range.'}
                </p>
                {filtersActive && (
                  <Link
                    href={basePath}
                    className="rounded-xl bg-brand-blue-500 px-6 py-2 text-body2 font-medium text-light-100 hover:bg-brand-blue-600"
                  >
                    Clear all filters
                  </Link>
                )}
              </div>
            )}

            <Pagination
              page={listing.page}
              pageCount={listing.pageCount}
              hrefFor={(page) => `${basePath}${withParam(raw, 'page', page > 1 ? String(page) : null)}`}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
