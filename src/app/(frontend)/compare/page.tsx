import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { CompareSection } from '@/components/product-page/CompareSection'
import { parseCompareIds } from '@/lib/compare-rules'
import { loadComparison } from '@/lib/storefront/product-page'

/** Every choice of products makes a new address, with nothing worth indexing. */
export const metadata: Metadata = {
  title: 'Compare Products',
  robots: { index: false, follow: true },
}

/** A shareable comparison: the address holds the products, so a link shows the same table. */
export default async function ComparePage(props: PageProps<'/compare'>) {
  const { products } = await props.searchParams
  const ids = parseCompareIds(Array.isArray(products) ? products[0] : products)
  const comparison = ids.length > 0 ? await loadComparison(ids) : null

  return (
    <main className="bg-light-400 pb-8">
      <div className="container-page flex flex-col gap-5 pt-4 lg:pt-5">
        <Breadcrumbs items={[{ label: 'Compare Products' }]} />
        <h1 className="text-h5 font-medium text-dark-500 lg:text-h3">Compare Products</h1>
        {comparison ? (
          <>
            {comparison.dropped && (
              <p role="status" className="rounded-lg bg-brand-red-100 p-3 text-body3 text-dark-500 lg:text-body1">
                Only products from the same category can be compared, so some were left out.
              </p>
            )}
            <CompareSection initial={comparison} categoryName={comparison.categoryName} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-[0.5px] border-dark-100 bg-light-100 p-8 text-center text-body2 text-dark-400 lg:text-h6">
            <p>Open any product and use its comparison to choose what to compare.</p>
            <Link href="/products" className="font-medium text-brand-red-500 underline">
              Browse products
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
