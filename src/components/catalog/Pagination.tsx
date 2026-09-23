import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

type Props = {
  page: number
  pageCount: number
  /** Builds the link for a page, keeping the current filters. */
  hrefFor: (page: number) => string
}

/** 1 … 4 5 6 … 12: the first, last and the pages either side of the current one. */
const pagesToShow = (page: number, pageCount: number): (number | 'gap')[] => {
  const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b)
  return wanted.flatMap((n, index) => (index > 0 && n - wanted[index - 1] > 1 ? ['gap' as const, n] : [n]))
}

const cell = 'grid size-10 place-items-center rounded-xl text-body2'

export const Pagination = ({ page, pageCount, hrefFor }: Props) => {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} aria-label="Previous page" className={cn(cell, 'text-dark-500 hover:bg-brand-blue-100')}>
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <span className={cn(cell, 'text-dark-200')} aria-hidden>
          <ChevronLeft className="size-5" />
        </span>
      )}
      {pagesToShow(page, pageCount).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-dark-300">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              cell,
              entry === page
                ? 'bg-brand-blue-500 font-medium text-light-100'
                : 'border-[0.5px] border-brand-blue-200 bg-light-100 text-dark-500 hover:bg-brand-blue-100',
            )}
          >
            {entry}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} aria-label="Next page" className={cn(cell, 'text-dark-500 hover:bg-brand-blue-100')}>
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className={cn(cell, 'text-dark-200')} aria-hidden>
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  )
}
