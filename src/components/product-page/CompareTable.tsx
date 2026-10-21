import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { cardPrice } from '@/components/product/ProductCard'
import type { ProductPageData } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

import { HorizontalScroller } from './HorizontalScroller'

type Compare = NonNullable<ProductPageData['compare']>

const GroupHeading = ({ children }: { children: ReactNode }) => (
  <div className="col-span-full bg-brand-blue-100 p-2 lg:p-4">
    <p className="sticky left-4 inline-block text-[0.75rem] font-semibold text-brand-blue-500 lg:text-h6">
      {children}
    </p>
  </div>
)

const Cell = ({
  label,
  children,
  shaded,
}: {
  label: string
  children: ReactNode
  shaded: boolean
}) => (
  <div
    className={cn(
      'flex flex-col border-r-[0.5px] border-neutral-300 px-2 py-2 lg:px-4',
      shaded ? 'bg-light-300' : 'bg-light-100',
    )}
  >
    <span className="text-[0.625rem] leading-4 text-dark-300 lg:text-body3">{label}</span>
    <span className="text-[0.75rem] leading-5 font-medium text-dark-500 lg:text-body2">
      {children}
    </span>
  </div>
)

/** One column per product; rows line up across columns because they share one grid. */
export const CompareTable = ({ compare }: { compare: Compare }) => {
  const { columns, specLabels } = compare
  const basicLabels = columns[0].basics.map((basic) => basic.label)
  const grid = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(var(--comparison-column), 1fr))`,
  }

  return (
    <section
      id="compare"
      aria-labelledby="compare-heading"
      className="flex scroll-mt-6 flex-col gap-6"
    >
      <h2
        id="compare-heading"
        className="text-[0.75rem] leading-5 font-medium text-dark-500 lg:text-body2 lg:text-h5"
      >
        Similar Products to Compare
      </h2>
      <div className="overflow-hidden rounded-lg border-[0.5px] border-brand-blue-200 bg-brand-blue-100">
        <HorizontalScroller label="Product comparison" arrowTop="9.1875rem">
          <div
            className="grid min-w-full [--comparison-column:10.6875rem] lg:[--comparison-column:16.25rem]"
            style={grid}
          >
            {columns.map((column) => (
              <div
                key={column.href}
                className={cn(
                  'flex flex-col gap-3 border-r-[0.5px] border-neutral-300 px-2 pt-2 pb-3 lg:px-4 lg:pt-4 lg:pb-6',
                  column.isCurrent ? 'bg-brand-blue-200' : 'bg-light-100',
                )}
              >
                <Link
                  href={column.href}
                  className={cn(
                    'relative h-[8.6875rem] lg:h-[12.875rem] overflow-hidden rounded-sm',
                    column.isCurrent ? 'bg-light-100' : 'bg-neutral-200',
                  )}
                >
                  <Image
                    src={column.image}
                    alt=""
                    fill
                    sizes="268px"
                    className="object-contain p-3"
                  />
                </Link>
                <div className="flex flex-col gap-2">
                  {column.isCurrent ? (
                    <p className="text-[0.75rem] leading-5 text-dark-500 lg:text-body2">
                      {column.name} <span className="sr-only">(this product)</span>
                    </p>
                  ) : (
                    <Link
                      href={column.href}
                      className="text-[0.75rem] leading-5 text-dark-500 lg:text-body2 hover:underline"
                    >
                      {column.name}
                    </Link>
                  )}
                  <p className="text-body2 font-semibold text-dark-500 lg:text-h6">{cardPrice(column.pricePaise)}</p>
                </div>
                {!column.sellOnline ? (
                  <EnquireButton
                    productName={column.name}
                    href={column.href}
                    className="h-10 w-full px-2 text-[0.75rem] lg:h-[2.8125rem] lg:text-body2"
                  />
                ) : (
                <AddToCartButton
                  productId={column.productId}
                  disabled={!column.inStock}
                  variant="blue"
                  className="h-10 w-full px-2 text-[0.75rem] lg:h-[2.8125rem] lg:text-body2"
                  aria-label={`Add ${column.name} to cart`}
                >
                  {column.inStock ? 'Add to Cart' : 'Out Of Stock'}
                </AddToCartButton>
                )}
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
