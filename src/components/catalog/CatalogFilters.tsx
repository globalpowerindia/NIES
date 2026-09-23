'use client'

import { Check, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import type { BrandFacet, SpecFacet } from '@/lib/storefront/catalog'
import { cn } from '@/lib/utils'

import { PriceRange } from './PriceRange'
import { useListingUrl } from './useListingUrl'

/**
 * `filter`: the category has sub-categories, and ticking them narrows this page (`?sub=`).
 * `navigate`: a leaf category, so its siblings are listed and ticking one opens it.
 */
export type CategoryFilter = {
  mode: 'filter' | 'navigate'
  allLabel: string
  allHref: string
  options: { slug: string; name: string; href: string }[]
  selected: string[]
}

type Props = {
  categories: CategoryFilter | null
  brands: BrandFacet[]
  specs: SpecFacet[]
  price: { min: number; max: number }
  current: {
    minRupees?: number
    maxRupees?: number
    inStock: boolean
    brands: string[]
    specs: Record<string, string[]>
  }
}

const VISIBLE_CATEGORIES = 7

const Checkbox = ({ checked }: { checked: boolean }) => (
  <span aria-hidden className="grid size-6 shrink-0 place-items-center">
    <span
      className={cn(
        'grid size-[18px] place-items-center rounded-[2px] border-2 border-dark-500 transition-colors',
        checked ? 'bg-dark-500' : 'bg-light-100 group-hover/option:border-brand-blue-500',
      )}
    >
      {checked && <Check className="size-3.5 text-light-100" strokeWidth={3.5} />}
    </span>
  </span>
)

const OptionRow = ({
  label,
  checked,
  onChange,
  href,
}: {
  label: string
  checked: boolean
  onChange?: () => void
  href?: string
}) =>
  href ? (
    <Link href={href} className="group/option flex items-center gap-2 p-2 text-body2 text-dark-500" aria-current={checked ? 'page' : undefined}>
      <Checkbox checked={checked} />
      {label}
    </Link>
  ) : (
    <label className="group/option flex cursor-pointer items-center gap-2 p-2 text-body2 text-dark-500">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <Checkbox checked={checked} />
      {label}
    </label>
  )

const FilterGroup = ({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) => (
  <details open={defaultOpen} className="group/filter w-full border-b-[0.5px] border-dark-200 bg-light-100 px-3 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between text-body1 text-dark-500 [&::-webkit-details-marker]:hidden">
      {title}
      <ChevronDown className="size-6 transition-transform group-open/filter:rotate-180" strokeWidth={1.5} />
    </summary>
    <div className="mt-4">{children}</div>
  </details>
)

export const CatalogFilters = ({ categories, brands, specs, price, current }: Props) => {
  const { update, toggle, isPending } = useListingUrl()
  const [showAllCategories, setShowAllCategories] = useState(false)
  const hasExtraFilter = current.inStock || Object.keys(current.specs).length > 0
  const [showMore, setShowMore] = useState(hasExtraFilter)
  const [mobileOpen, setMobileOpen] = useState(false)

  const categoryOptions = categories
    ? showAllCategories
      ? categories.options
      : categories.options.slice(0, VISIBLE_CATEGORIES)
    : []
  const hiddenCount = categories ? categories.options.length - VISIBLE_CATEGORIES : 0

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-h5 font-semibold text-dark-500 lg:text-h4">Filter</h2>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="catalog-filters"
          className="flex items-center gap-2 rounded-xl border border-brand-blue-200 bg-light-100 px-4 py-2 text-body2 text-dark-500 lg:hidden"
        >
          <SlidersHorizontal className="size-5" />
          {mobileOpen ? 'Hide filters' : 'Show filters'}
        </button>
      </div>

      <div
        id="catalog-filters"
        className={cn(
          'flex-col gap-3 rounded-xl bg-light-100 p-4 transition-opacity sm:p-8 lg:flex',
          mobileOpen ? 'flex' : 'hidden',
          isPending && 'opacity-60',
        )}
      >
        <div className="flex flex-col">
          {categories && categories.options.length > 0 && (
            <FilterGroup title="Category" defaultOpen>
              <div className="flex flex-col">
                <OptionRow
                  label={categories.allLabel}
                  checked={categories.selected.length === 0}
                  href={categories.mode === 'navigate' ? categories.allHref : undefined}
                  onChange={() => update((params) => params.delete('sub'))}
                />
                {categoryOptions.map((option) => (
                  <OptionRow
                    key={option.slug}
                    label={option.name}
                    checked={categories.selected.includes(option.slug)}
                    href={categories.mode === 'navigate' ? option.href : undefined}
                    onChange={() => toggle('sub', option.slug)}
                  />
                ))}
              </div>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((all) => !all)}
                  className="mt-4 flex items-center gap-1 py-1 text-body2 text-brand-blue-300 hover:underline"
                >
                  {showAllCategories ? 'Show less' : `+${hiddenCount} more`}
                  <ChevronRight className={cn('size-6 transition-transform', showAllCategories && '-rotate-90')} strokeWidth={1.5} />
                </button>
              )}
            </FilterGroup>
          )}

          {price.max > price.min && (
            <FilterGroup title="Price" defaultOpen>
              <PriceRange
                bounds={price}
                value={{ min: current.minRupees, max: current.maxRupees }}
                onCommit={(min, max) =>
                  update((params) => {
                    if (min > price.min) params.set('min', String(min))
                    else params.delete('min')
                    if (max < price.max) params.set('max', String(max))
                    else params.delete('max')
                  })
                }
              />
            </FilterGroup>
          )}

          {brands.length > 0 && (
            <FilterGroup title="Brand" defaultOpen={current.brands.length > 0}>
              <div className="flex flex-col">
                {brands.map((brand) => (
                  <OptionRow
                    key={brand.slug}
                    label={`${brand.name} (${brand.count})`}
                    checked={current.brands.includes(brand.slug)}
                    onChange={() => toggle('brand', brand.slug)}
                  />
                ))}
              </div>
            </FilterGroup>
          )}

          {showMore && (
            <>
              <FilterGroup title="Availability" defaultOpen>
                <OptionRow
                  label="In stock only"
                  checked={current.inStock}
                  onChange={() =>
                    update((params) => {
                      if (current.inStock) params.delete('stock')
                      else params.set('stock', '1')
                    })
                  }
                />
              </FilterGroup>
              {specs.map((spec) => (
                <FilterGroup key={spec.key} title={spec.label} defaultOpen={Boolean(current.specs[spec.key])}>
                  <div className="flex flex-col">
                    {spec.values.map(({ value, count }) => (
                      <OptionRow
                        key={value}
                        label={`${value} (${count})`}
                        checked={current.specs[spec.key]?.includes(value) ?? false}
                        onChange={() => toggle(`spec.${spec.key}`, value)}
                      />
                    ))}
                  </div>
                </FilterGroup>
              ))}
            </>
          )}
        </div>

        <Button variant="blue" className="w-full" onClick={() => setShowMore((more) => !more)} aria-expanded={showMore}>
          {showMore ? 'Fewer Filters' : 'More Filters'}
        </Button>
      </div>
    </div>
  )
}
