'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { DEFAULT_SEARCH_HINT, SearchHint } from '@/components/layout/SearchHint'
import { SearchPanel, SuggestionList, type TopMovingTile } from '@/components/layout/SearchPanel'
import { addRecentSearch, clearRecentSearches, readRecentSearches } from '@/lib/recent-searches'
import type { Suggestion } from '@/lib/storefront/search'

export const HeaderSearch = ({ tiles, hints }: { tiles: TopMovingTile[]; hints: string[] }) => {
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [recents, setRecents] = useState<string[]>([])
  const [term, setTerm] = useState('')
  // Tagged with the query they answer, so a stale reply is never shown for newer text.
  const [answered, setAnswered] = useState<{ query: string; suggestions: Suggestion[] }>({ query: '', suggestions: [] })

  // localStorage is read after mount: the server cannot know it, and rendering
  // it on the first pass would be a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one post-mount read of browser storage
  useEffect(() => setRecents(readRecentSearches()), [])

  // Type-ahead. Debounced so a fast typist makes one request, not eight, and
  // aborted on the next keystroke so a slow reply can't overwrite a newer one.
  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (!response.ok) return
        const data: { suggestions?: Suggestion[] } = await response.json()
        setAnswered({ query, suggestions: data.suggestions ?? [] })
      } catch {
        // Aborted, offline or a bad reply: the panel simply shows no
        // suggestions. Search itself still works from the form.
      }
    }, 180)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term])

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

  const go = (term: string) => {
    const query = term.trim()
    if (!query) return
    setRecents(addRecentSearch(query))
    setOpen(false)
    input.current?.blur()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  // While there is a query, the panel belongs to the suggestions; the idle
  // panel (recents and tiles) is what you get before typing starts.
  const typing = term.trim().length >= 2
  const suggestions = answered.query === term.trim() ? answered.suggestions : []
  const hasPanel = typing ? suggestions.length > 0 : recents.length > 0 || tiles.length > 0

  return (
    <div ref={root} className="relative order-3 mt-4 w-full md:order-none md:mt-0 md:max-w-[54.5625rem] md:flex-1">
      <form
        action="/search"
        onSubmit={(event) => {
          event.preventDefault()
          go(input.current?.value ?? '')
        }}
        className="flex h-[3.1875rem] w-full items-center justify-between rounded-xl border-[0.5px] border-dark-200 bg-brand-blue-100 py-3 pr-2.5 pl-4 md:h-[3.625rem]"
      >
        <div className="relative min-w-0 flex-1 self-stretch">
          {/* 16px on phones: iOS Safari zooms the whole page when focusing anything smaller. */}
          <Input
            ref={input}
            type="search"
            name="q"
            // Transparent, as SearchHint draws it; still needed for :placeholder-shown.
            placeholder={DEFAULT_SEARCH_HINT}
            aria-label="Search products"
            aria-expanded={open && hasPanel}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setTerm(event.target.value)
              setOpen(true)
            }}
            className="peer h-full bg-transparent text-body2 text-dark-500 outline-none placeholder:text-transparent md:text-body1"
          />
          <SearchHint hints={hints} />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-blue-500 text-light-100 transition-colors hover:bg-brand-blue-600 md:size-10"
        >
          <Search className="size-5" />
        </button>
      </form>

      {open && hasPanel && (
        // The design sizes this for desktop, where it never gets near the cap.
        // On a phone a long list of recents and tiles would otherwise run off
        // the bottom of the screen with nothing to show more is there.
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto">
          {typing ? (
            <SuggestionList suggestions={suggestions} query={term} />
          ) : (
            <SearchPanel
              recents={recents}
              tiles={tiles}
              onPick={go}
              onClear={() => {
                clearRecentSearches()
                setRecents([])
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
