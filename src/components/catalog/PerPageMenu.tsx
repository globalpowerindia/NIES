'use client'

import { ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from '@/lib/storefront/listing-params'

import { useListingUrl } from './useListingUrl'

/** How many products a page shows. The default needs no `?perPage=`, so its URL stays clean. */
export const PerPageMenu = ({ value }: { value: number }) => {
  const { update } = useListingUrl()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Products per page: ${value}`}
        className="group/per-page flex items-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500"
      >
        <span className="p-0.5 text-[0.625rem] leading-4 whitespace-nowrap text-dark-300 md:p-1 md:text-h6 md:font-medium">Show :</span>
        <span className="p-0.5 text-[0.625rem] leading-4 whitespace-nowrap text-dark-400 md:p-1 md:text-h6 md:font-semibold">
          {value}
        </span>
        <ChevronDown className="size-4 shrink-0 text-dark-400 transition-transform group-data-[state=open]/per-page:rotate-180 md:size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label="Products per page"
        className="w-auto min-w-32 rounded-xl border-[0.5px] border-brand-blue-200 bg-light-100 p-0 py-2 shadow-lg ring-0"
      >
        <DropdownMenuRadioGroup
          value={String(value)}
          onValueChange={(next) =>
            update((params) => {
              if (Number(next) === DEFAULT_PER_PAGE) params.delete('perPage')
              else params.set('perPage', next)
            })
          }
        >
          {PER_PAGE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={String(option)}
              className="cursor-pointer rounded-none px-4 py-2 text-body2 text-dark-500 focus:bg-brand-blue-100 data-[state=checked]:font-semibold data-[state=checked]:text-brand-blue-500 [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            >
              {option} per page
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
