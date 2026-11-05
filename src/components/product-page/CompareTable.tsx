import { Plus, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { cardPrice } from '@/components/product/ProductCard'
import { valuesDiffer } from '@/lib/compare-rules'
import type { CompareColumn } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

import { HorizontalScroller } from './HorizontalScroller'

/** The first product stays in view while the others scroll, so phones can compare any two. */
const PINNED = 'sticky left-0 z-[1] lg:relative lg:z-auto'

const GroupHeading = ({ children }: { children: ReactNode }) => (
  <div className="col-span-full bg-light-500 p-2 lg:p-4">
    <p className="sticky left-4 inline-block text-[0.75rem] font-semibold text-dark-500 lg:text-h6">
      {children}
    </p>
  </div>
)

const Cell = ({
  label,
  children,
  shaded,
  pinned,
}: {
  label?: string
  children?: ReactNode
  shaded: boolean
  pinned?: boolean
}) => (
  <div
    className={cn(
      'flex flex-col border-r-[0.5px] border-neutral-300 px-2 py-2 lg:px-4',
      shaded ? 'bg-light-300' : 'bg-light-100',
      pinned && PINNED,
    )}
  >
    {label && <span className="text-[0.625rem] leading-4 text-dark-300 lg:text-body3">{label}</span>}
    <span className="text-[0.75rem] leading-5 font-medium text-dark-500 lg:text-body2">
      {children}
    </span>
  </div>
)

type Row = { label: string; values: (string | undefined)[]; render?: (value: string | undefined) => ReactNode }

/** One column per product; rows line up across columns because they share one grid. */
export const CompareTable = ({
  columns,
  specLabels,
  differencesOnly,
  onAdd,
  onRemove,
}: {
  columns: CompareColumn[]
  specLabels: string[]
  differencesOnly: boolean
  /** Shows an empty column to add another product to. */
  onAdd?: () => void
  onRemove: (productId: number) => void
}) => {
  const slots = onAdd ? 1 : 0
  const grid = {
    gridTemplateColumns: `repeat(${columns.length + slots}, minmax(var(--comparison-column), 1fr))`,
  }
  const keep = (row: Row) => !differencesOnly || valuesDiffer(row.values)

  const basics: Row[] = (columns[0]?.basics ?? [])
    .map((basic, index) => ({
      label: basic.label,
      values: columns.map((column) => column.basics[index]?.value),
      render: (value: string | undefined) =>
        basic.label === 'Rating' && value !== 'No reviews yet' ? (
          <span className="flex items-center gap-1">
            <span aria-hidden className="text-green-400">
              ★
            </span>
            {value}
          </span>
        ) : (
          value
        ),
    }))
    .filter(keep)
  const specs: Row[] = specLabels
    .map((label) => ({ label, values: columns.map((column) => column.specs[label]) }))
    .filter(keep)

  const rows = (group: Row[]) =>
    group.map((row, index) => [
      ...columns.map((column, position) => (
        <Cell
          key={`${row.label}-${column.productId}`}
          label={row.label}
          shaded={index % 2 === 1}
          pinned={position === 0}
        >
          {row.render ? row.render(row.values[position]) : (row.values[position] ?? '—')}
        </Cell>
      )),
      slots > 0 && <Cell key={`${row.label}-slot`} shaded={index % 2 === 1} />,
    ])

  return (
    <div className="overflow-hidden rounded-lg border-[0.5px] border-dark-100 bg-light-100">
      <HorizontalScroller label="Product comparison" arrowTop="9.1875rem">
        <div
          className="grid min-w-full [--comparison-column:10.6875rem] lg:[--comparison-column:16.25rem]"
          style={grid}
        >
          {columns.map((column, position) => (
            <div
              key={column.productId}
              className={cn(
                'relative flex flex-col gap-3 border-r-[0.5px] border-neutral-300 px-2 pt-2 pb-3 lg:px-4 lg:pt-4 lg:pb-6',
                column.isCurrent ? 'bg-light-500' : 'bg-light-100',
                position === 0 && PINNED,
              )}
            >
              <Link
                href={column.href}
                className="relative h-[8.6875rem] overflow-hidden rounded-sm bg-light-100 lg:h-[12.875rem]"
              >
                <Image src={column.image} alt="" fill sizes="268px" className="object-contain p-3" />
              </Link>
              {!column.isCurrent && (
                <button
                  type="button"
                  onClick={() => onRemove(column.productId)}
                  aria-label={`Remove ${column.name} from the comparison`}
                  className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-light-100/90 text-dark-500 shadow-sm transition-colors hover:bg-brand-red-100 hover:text-brand-red-500 lg:top-5 lg:right-5 lg:size-10"
                >
                  <X className="size-4 lg:size-5" aria-hidden />
                </button>
              )}
              <div className="flex flex-col gap-2">
                {column.isCurrent ? (
                  <p className="text-[0.75rem] leading-5 text-dark-500 lg:text-body2">
                    {column.name}{' '}
                    <span className="font-medium text-brand-red-500">(this product)</span>
                  </p>
                ) : (
                  <Link
                    href={column.href}
                    className="text-[0.75rem] leading-5 text-dark-500 hover:underline lg:text-body2"
                  >
                    {column.name}
                  </Link>
                )}
                <p className="text-body2 font-semibold text-dark-500 lg:text-h6">
                  {cardPrice(column.pricePaise)}
                </p>
              </div>
              <div className="mt-auto">
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
            </div>
          ))}
          {slots > 0 && (
            <div className="border-r-[0.5px] border-neutral-300 bg-light-100 p-2 lg:p-4">
              <button
                type="button"
                onClick={onAdd}
                className="flex size-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-dark-200 text-body3 font-medium text-dark-400 transition-colors hover:border-brand-red-500 hover:text-brand-red-500 lg:text-body1"
              >
                <Plus className="size-6" aria-hidden />
                Add product
              </button>
            </div>
          )}

          {basics.length > 0 && <GroupHeading>Basic Details</GroupHeading>}
          {rows(basics)}

          {specs.length > 0 && <GroupHeading>Technical Specification</GroupHeading>}
          {rows(specs)}

          {differencesOnly && basics.length === 0 && specs.length === 0 && (
            <p className="col-span-full bg-light-100 p-4 text-center text-body3 text-dark-400 lg:text-body1">
              These products have the same details on record.
            </p>
          )}
        </div>
      </HorizontalScroller>
    </div>
  )
}
