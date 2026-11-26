'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState, useTransition } from 'react'

/**
 * Filters live in the URL so every listing can be shared and reloaded. Each
 * change drops `page`, since page 3 of the old results means nothing now.
 *
 * `searchParams` only moves once the new page has rendered, so a second click
 * made while the first is still loading must build on the URL the first click
 * asked for, not on the one still showing; otherwise it silently undoes the
 * first (tick brand A, then B quickly, and only B stays ticked). `latest`
 * holds that requested URL until the navigation settles, and `params` exposes
 * it so ticks show straight away.
 */
export const useListingUrl = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const latest = useRef<string | null>(null)
  const [requested, setRequested] = useState<string | null>(null)

  const current = isPending && requested !== null ? requested : searchParams.toString()

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void, destination = pathname) => {
      const base = isPending && latest.current !== null ? latest.current : searchParams.toString()
      const params = new URLSearchParams(base)
      mutate(params)
      params.delete('page')
      const query = params.toString()
      latest.current = query
      setRequested(query)
      startTransition(() => {
        router.push(query ? `${destination}?${query}` : destination, { scroll: false })
      })
    },
    [isPending, pathname, router, searchParams],
  )

  /** Adds or removes one value from a comma-separated param such as `brand=hcc,eastman`. */
  const toggle = useCallback(
    (key: string, value: string) =>
      update((params) => {
        const current = (params.get(key) ?? '').split(',').filter(Boolean)
        const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
        if (next.length) params.set(key, next.join(','))
        else params.delete(key)
      }),
    [update],
  )

  /** Adds or removes one value of a repeated param such as `spec.power=a&spec.power=b`. */
  const toggleRepeated = useCallback(
    (key: string, value: string) =>
      update((params) => {
        const values = params.getAll(key)
        params.delete(key)
        const next = values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
        for (const entry of next) params.append(key, entry)
      }),
    [update],
  )

  return { searchParams, params: new URLSearchParams(current), update, toggle, toggleRepeated, isPending }
}
