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
      <DropdownMenuTrigger className="group/sort flex items-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500">
        <span className="grid size-[33px] place-items-center">
          <ListFilter className="size-6 text-dark-400" strokeWidth={1.5} />
        </span>
        <span className="p-1 text-body2 font-medium whitespace-nowrap text-dark-300 sm:text-h6">Sort By :</span>
        <span className="p-1 text-body2 font-semibold whitespace-nowrap text-dark-400 sm:text-h6">
          {SORTS[value]}
        </span>
        <ChevronDown className="size-5 text-dark-400 transition-transform group-data-[state=open]/sort:rotate-180" />
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
