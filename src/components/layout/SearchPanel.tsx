import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { MediaInfo } from '@/lib/storefront/content'
import type { Suggestion } from '@/lib/storefront/search'

export type TopMovingTile = { label: string; href: string; image: MediaInfo }

export type SearchPanelProps = {
  recents: string[]
  tiles: TopMovingTile[]
  onPick: (term: string) => void
  onClear: () => void
}

const KIND_LABEL: Record<Suggestion['kind'], string> = {
  product: '',
  brand: 'Brand',
  category: 'Category',
}

/** What replaces the idle panel once there is something to suggest. */
export const SuggestionList = ({ suggestions, query }: { suggestions: Suggestion[]; query: string }) => (
  <div className="flex w-full flex-col gap-3 rounded-xl border-[0.5px] border-brand-blue-200 bg-white p-4">
    <h2 className="text-body2 font-medium text-dark-500">Suggestions</h2>
    <ul className="flex flex-col">
      {suggestions.map((suggestion) => (
        <li key={`${suggestion.kind}-${suggestion.href}`} className="border-b-[0.5px] border-dark-100 last:border-b-0">
          <Link
            href={suggestion.href}
            className="flex items-center justify-between gap-3 py-3 text-body2 text-dark-500 hover:text-brand-blue-300"
          >
            <span className="truncate">{highlight(suggestion.label, query)}</span>
            {KIND_LABEL[suggestion.kind] && (
              <span className="shrink-0 rounded-md bg-light-500 px-2 py-0.5 text-body3 text-dark-300">
                {KIND_LABEL[suggestion.kind]}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)

/** Bolds the part the shopper has typed, so the rest reads as the completion. */
const highlight = (label: string, query: string): ReactNode => {
  const at = label.toLowerCase().indexOf(query.trim().toLowerCase())
  if (at === -1 || !query.trim()) return label
  const end = at + query.trim().length
  return (
    <>
      {label.slice(0, at)}
      <span className="font-semibold">{label.slice(at, end)}</span>
      {label.slice(end)}
    </>
  )
}

/**
 * What the search box shows before anything is typed: the shopper's own recent
 * searches, then a curated set of tiles. Type-ahead suggestions replace this
 * once there is a query.
 */
export const SearchPanel = ({ recents, tiles, onPick, onClear }: SearchPanelProps) => (
  <div className="flex w-full flex-col gap-4 rounded-xl border-[0.5px] border-brand-blue-200 bg-white p-4">
    {recents.length > 0 && (
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body2 font-medium text-dark-500">Recent Searches</h2>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 py-1 text-body2 text-brand-blue-300 hover:underline"
          >
            Clear History
            <Image src="/icons/arrow-filled.svg" alt="" width={24} height={24} />
          </button>
        </div>

        <ul className="flex flex-col">
          {recents.map((term) => (
            <li key={term} className="border-b-[0.5px] border-dark-100">
              <button
                type="button"
                onClick={() => onPick(term)}
                className="flex w-full items-center justify-between py-4 text-left text-body2 text-dark-500 hover:text-brand-blue-300"
              >
                <span className="truncate">{term}</span>
                <Image src="/icons/arrow-up-right.svg" alt="" width={18} height={18} className="shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    )}

    {tiles.length > 0 && (
      <section className="flex flex-col gap-3">
        <h2 className="text-body2 font-medium text-dark-500">Top Moving Products</h2>
        <ul className="flex flex-wrap gap-2">
          {tiles.map((tile) => (
            <li key={`${tile.label}-${tile.href}`}>
              <Link
                href={tile.href}
                className="flex h-[87px] items-center gap-2 rounded-lg border-[0.5px] border-light-600 bg-light-500 pt-1 pr-4 pb-2 pl-2 transition-colors hover:border-brand-blue-300"
              >
                <Image
                  src={tile.image.url}
                  alt={tile.image.alt || tile.label}
                  width={57}
                  height={57}
                  className="size-[57px] shrink-0 object-contain"
                />
                <span className="text-body2 font-medium whitespace-nowrap text-dark-500">{tile.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )}
  </div>
)
