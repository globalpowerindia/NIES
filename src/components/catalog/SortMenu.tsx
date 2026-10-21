'use client'

import { ChevronDown, ListFilter } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SORTS, type SortKey } from '@/lib/storefront/listing-params'

import { useListingUrl } from './useListingUrl'

/** `defaultSort` is the key that needs no `?sort=`, so its URL stays clean. */
export const SortMenu = ({
  value,
  options = (Object.keys(SORTS) as SortKey[]).filter((key) => key !== 'relevance'),
  defaultSort = 'popularity',
}: {
  value: SortKey
  options?: SortKey[]
  defaultSort?: SortKey
}) => {
  const { update } = useListingUrl()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger aria-label={`Sort products: ${SORTS[value]}`} className="group/sort flex max-w-full items-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500">
        <span className="hidden size-[2.0625rem] place-items-center md:grid">
          <ListFilter className="size-6 text-dark-400" strokeWidth={1.5} />
        </span>
        <span className="p-0.5 text-[0.625rem] leading-4 whitespace-nowrap text-dark-300 md:p-1 md:text-h6 md:font-medium">Sort By :</span>
        <span className="p-0.5 text-[0.625rem] leading-4 whitespace-nowrap text-dark-400 md:p-1 md:text-h6 md:font-semibold">
          {SORTS[value]}
        </span>
        <ChevronDown className="size-4 shrink-0 text-dark-400 transition-transform group-data-[state=open]/sort:rotate-180 md:size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label="Sort products"
        className="w-auto min-w-56 rounded-xl border-[0.5px] border-brand-blue-200 bg-light-100 p-0 py-2 shadow-lg ring-0"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(key) =>
            update((params) => {
              if (key === defaultSort) params.delete('sort')
              else params.set('sort', key)
            })
          }
        >
          {options.map((key) => (
            <DropdownMenuRadioItem
              key={key}
              value={key}
              className="cursor-pointer rounded-none px-4 py-2 text-body2 text-dark-500 focus:bg-brand-blue-100 data-[state=checked]:font-semibold data-[state=checked]:text-brand-blue-500 [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            >
              {SORTS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
