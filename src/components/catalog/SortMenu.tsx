'use client'

import { ChevronDown, ListFilter } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { SORTS, type SortKey } from '@/lib/storefront/listing-params'
import { cn } from '@/lib/utils'

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
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex items-center"
      >
        <span className="grid size-[33px] place-items-center">
          <ListFilter className="size-6 text-dark-400" strokeWidth={1.5} />
        </span>
        <span className="p-1 text-body2 font-medium whitespace-nowrap text-dark-300 sm:text-h6">Sort By :</span>
        <span className="p-1 text-body2 font-semibold whitespace-nowrap text-dark-400 sm:text-h6">{SORTS[value]}</span>
        <ChevronDown className={cn('size-5 text-dark-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort products"
          className="absolute right-0 z-20 mt-2 min-w-56 overflow-hidden rounded-xl border-[0.5px] border-brand-blue-200 bg-light-100 py-2 shadow-lg"
        >
          {options.map((key) => (
            <li key={key} role="option" aria-selected={key === value}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  update((params) => {
                    if (key === defaultSort) params.delete('sort')
                    else params.set('sort', key)
                  })
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-body2 hover:bg-brand-blue-100',
                  key === value ? 'font-semibold text-brand-blue-500' : 'text-dark-500',
                )}
              >
                {SORTS[key]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
