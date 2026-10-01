import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/money'
import type { ProductPageData } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

import { HorizontalScroller } from './HorizontalScroller'

type Compare = NonNullable<ProductPageData['compare']>

const GroupHeading = ({ children }: { children: ReactNode }) => (
  <div className="col-span-full bg-brand-blue-100 p-4">
    <p className="sticky left-4 inline-block text-h6 font-semibold text-brand-blue-500">{children}</p>
  </div>
)

const Cell = ({ label, children, shaded }: { label: string; children: ReactNode; shaded: boolean }) => (
  <div className={cn('flex flex-col border-r-[0.5px] border-neutral-300 px-4 py-2', shaded ? 'bg-light-300' : 'bg-light-100')}>
    <span className="text-body3 text-dark-300">{label}</span>
    <span className="text-body2 font-medium text-dark-500">{children}</span>
  </div>
)

/** One column per product; rows line up across columns because they share one grid. */
export const CompareTable = ({ compare }: { compare: Compare }) => {
  const { columns, specLabels } = compare
  const basicLabels = columns[0].basics.map((basic) => basic.label)
  const grid = { gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }

  return (
    <section id="compare" aria-labelledby="compare-heading" className="flex scroll-mt-6 flex-col gap-6">
      <h2 id="compare-heading" className="text-h5 font-medium text-dark-500">
        Similar Products to Compare
      </h2>
      <div className="overflow-hidden rounded-lg border-[0.5px] border-brand-blue-200 bg-brand-blue-100">
        <HorizontalScroller label="Product comparison" arrowTop="147px">
          <div className="grid min-w-full" style={grid}>
            {columns.map((column) => (
              <div
                key={column.href}
                className={cn(
                  'flex flex-col gap-3 border-r-[0.5px] border-neutral-300 px-4 pt-4 pb-6',
                  column.isCurrent ? 'bg-brand-blue-200' : 'bg-light-100',
                )}
              >
                <Link
                  href={column.href}
                  className={cn('relative h-[206px] overflow-hidden rounded-sm', column.isCurrent ? 'bg-light-100' : 'bg-neutral-200')}
                >
                  <Image src={column.image} alt="" fill sizes="268px" className="object-contain p-3" />
                </Link>
                <div className="flex flex-col gap-2">
                  {column.isCurrent ? (
                    <p className="text-body2 text-dark-500">
                      {column.name} <span className="sr-only">(this product)</span>
                    </p>
                  ) : (
                    <Link href={column.href} className="text-body2 text-dark-500 hover:underline">
                      {column.name}
                    </Link>
                  )}
                  <p className="text-h6 font-semibold text-dark-500">{formatCurrency(column.pricePaise)}</p>
                </div>
                <Button variant="blue" className="h-[45px] w-full">
                  Add to Cart
                </Button>
              </div>
            ))}

            <GroupHeading>Basic Details</GroupHeading>
            {basicLabels.map((label, row) =>
              columns.map((column) => {
                const basic = column.basics[row]
                return (
                  <Cell key={`${label}-${column.href}`} label={label} shaded={row % 2 === 1}>
                    {basic.isRating ? (
                      <span className="flex items-center gap-1">
                        <span aria-hidden className="text-green-400">
                          ★
                        </span>
                        {basic.value}
                      </span>
                    ) : (
                      basic.value
                    )}
                  </Cell>
                )
              }),
            )}

            {specLabels.length > 0 && <GroupHeading>Technical Specification</GroupHeading>}
            {specLabels.map((label, row) =>
              columns.map((column) => (
                <Cell key={`${label}-${column.href}`} label={label} shaded={row % 2 === 1}>
                  {column.specs[label] ?? '—'}
                </Cell>
              )),
            )}
          </div>
        </HorizontalScroller>
      </div>
    </section>
  )
}
