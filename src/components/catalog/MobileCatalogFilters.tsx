'use client'

import { ChevronLeft, SlidersHorizontal } from 'lucide-react'
import { Dialog, Tabs } from 'radix-ui'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { CatalogFiltersProps } from './CatalogFilters'
import { PriceRange } from './PriceRange'
import { useListingUrl } from './useListingUrl'

const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]

const Option = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) => (
  <label className="flex min-h-10 cursor-pointer items-center gap-2 py-2 text-[12px] leading-5 text-dark-500">
    <span className="grid size-6 shrink-0 place-items-center">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="size-[18px] rounded-[2px] border-2 border-dark-500 bg-light-100 data-[state=checked]:border-dark-500 data-[state=checked]:bg-dark-500 data-[state=checked]:text-light-100"
      />
    </span>
    {label}
  </label>
)

const tabClass =
  'min-h-11 w-full rounded-[2px] px-3 text-left text-body3 text-dark-500 data-[state=active]:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-brand-blue-500'

export const MobileCatalogFilters = ({
  categories,
  brands,
  specs,
  price,
  current,
}: CatalogFiltersProps) => {
  const { update } = useListingUrl()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(current)
  const [selected, setSelected] = useState(categories?.selected ?? [])
  const [active, setActive] = useState(categories ? 'category' : 'price')
  const [priceVersion, setPriceVersion] = useState(0)

  // A viewport change must not leave an invisible modal trapping desktop focus.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false)
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  const changeOpen = (next: boolean) => {
    if (next) {
      setDraft({ ...current, brands: [...current.brands], specs: { ...current.specs } })
      setSelected(categories?.selected ?? [])
      setActive(categories ? 'category' : 'price')
      setPriceVersion((version) => version + 1)
    }
    setOpen(next)
  }

  const clear = () => {
    setDraft({ inStock: false, brands: [], specs: {} })
    setSelected([])
    setPriceVersion((version) => version + 1)
  }

  const apply = () => {
    const destination =
      categories?.mode === 'navigate'
        ? (categories.options.find((option) => selected.includes(option.slug))?.href ??
          categories.allHref)
        : undefined
    update((params) => {
      for (const key of [...params.keys()]) {
        if (['sub', 'brand', 'min', 'max', 'stock'].includes(key) || key.startsWith('spec.'))
          params.delete(key)
      }
      if (categories?.mode === 'filter' && selected.length) params.set('sub', selected.join(','))
      if (draft.brands.length) params.set('brand', draft.brands.join(','))
      if (draft.minRupees !== undefined && draft.minRupees > price.min)
        params.set('min', String(draft.minRupees))
      if (draft.maxRupees !== undefined && draft.maxRupees < price.max)
        params.set('max', String(draft.maxRupees))
      if (draft.inStock) params.set('stock', '1')
      for (const [key, values] of Object.entries(draft.specs)) {
        if (values.length) params.set(`spec.${key}`, values.join(','))
      }
    }, destination)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger className="flex h-[37px] w-[100px] items-center gap-2.5 rounded-lg border-[0.5px] border-dark-400 px-2.5 text-body3 text-dark-500 focus-visible:outline-2 focus-visible:outline-brand-blue-500 lg:hidden">
        <SlidersHorizontal className="size-5" strokeWidth={1.5} aria-hidden />
        Filter
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/20" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[100] flex h-dvh flex-col bg-white pt-[env(safe-area-inset-top)] text-dark-500 outline-none"
        >
          <header className="flex h-14 shrink-0 items-center justify-between pr-[18px] pl-[19px]">
            <div className="flex items-center gap-2">
              <Dialog.Close
                aria-label="Back to products"
                className="grid size-6 place-items-center rounded focus-visible:outline-2"
              >
                <ChevronLeft className="size-6" strokeWidth={1.5} />
              </Dialog.Close>
              <Dialog.Title className="text-body1">Filter</Dialog.Title>
            </div>
            <button
              type="button"
              onClick={clear}
              className="py-3 pl-3 text-body3 text-brand-red-400"
            >
              Clear Filters
            </button>
          </header>
          <Tabs.Root
            value={active}
            onValueChange={setActive}
            orientation="vertical"
            className="flex min-h-0 flex-1 pr-[18px] pl-[19px]"
          >
            <Tabs.List
              aria-label="Filter groups"
              className="flex w-[132px] shrink-0 flex-col items-start gap-0 overflow-y-auto border-r border-neutral-600 pr-3 max-[359px]:w-[108px]"
            >
              {categories && (
                <Tabs.Trigger value="category" className={tabClass}>
                  Category
                </Tabs.Trigger>
              )}
              <Tabs.Trigger value="price" className={tabClass}>
                Price
              </Tabs.Trigger>
              {brands.length > 0 && (
                <Tabs.Trigger value="brand" className={tabClass}>
                  Brand
                </Tabs.Trigger>
              )}
              <Tabs.Trigger value="availability" className={tabClass}>
                Availability
              </Tabs.Trigger>
              {specs.map((spec) => (
                <Tabs.Trigger key={spec.key} value={`spec.${spec.key}`} className={tabClass}>
                  {spec.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain pl-3.5">
              {categories && (
                <Tabs.Content value="category" className="outline-none">
                  <h2 className="pb-2 text-label2 font-semibold">
                    {categories.allLabel.replace(/^All /, '')}
                  </h2>
                  <Option
                    label={categories.allLabel}
                    checked={!selected.length}
                    onChange={() => setSelected([])}
                  />
                  {categories.options.map((option) => (
                    <Option
                      key={option.slug}
                      label={option.name}
                      checked={selected.includes(option.slug)}
                      onChange={() =>
                        setSelected((values) =>
                          categories.mode === 'navigate'
                            ? [option.slug]
                            : toggleValue(values, option.slug),
                        )
                      }
                    />
                  ))}
                </Tabs.Content>
              )}
              <Tabs.Content
                value="price"
                className="space-y-6 pr-1 outline-none [&_label]:flex-col [&_label]:items-start [&_input]:w-full"
              >
                <h2 className="text-label2 font-semibold">Price range</h2>
                {price.max > price.min ? (
                  <PriceRange
                    key={priceVersion}
                    bounds={price}
                    value={{ min: draft.minRupees, max: draft.maxRupees }}
                    onCommit={(minRupees, maxRupees) =>
                      setDraft((value) => ({ ...value, minRupees, maxRupees }))
                    }
                  />
                ) : (
                  <p className="text-body3">No price range available.</p>
                )}
              </Tabs.Content>
              <Tabs.Content value="brand" className="outline-none">
                <h2 className="pb-2 text-label2 font-semibold">Brand</h2>
                {brands.map((brand) => (
                  <Option
                    key={brand.slug}
                    label={`${brand.name} (${brand.count})`}
                    checked={draft.brands.includes(brand.slug)}
                    onChange={() =>
                      setDraft((value) => ({
                        ...value,
                        brands: toggleValue(value.brands, brand.slug),
                      }))
                    }
                  />
                ))}
              </Tabs.Content>
              <Tabs.Content value="availability" className="outline-none">
                <h2 className="pb-2 text-label2 font-semibold">Availability</h2>
                <Option
                  label="In stock only"
                  checked={draft.inStock}
                  onChange={() => setDraft((value) => ({ ...value, inStock: !value.inStock }))}
                />
              </Tabs.Content>
              {specs.map((spec) => (
                <Tabs.Content key={spec.key} value={`spec.${spec.key}`} className="outline-none">
                  <h2 className="pb-2 text-label2 font-semibold">{spec.label}</h2>
                  {spec.values.map(({ value, count }) => (
                    <Option
                      key={value}
                      label={`${value} (${count})`}
                      checked={draft.specs[spec.key]?.includes(value) ?? false}
                      onChange={() =>
                        setDraft((previous) => ({
                          ...previous,
                          specs: {
                            ...previous.specs,
                            [spec.key]: toggleValue(previous.specs[spec.key] ?? [], value),
                          },
                        }))
                      }
                    />
                  ))}
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>
          <div className="shrink-0 pt-5 pr-[18px] pb-[max(16px,env(safe-area-inset-bottom))] pl-[19px]">
            <Button type="button" variant="blue" className="w-full" onClick={apply}>
              Apply
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
