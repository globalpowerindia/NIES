'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

/**
 * Filters live in the URL so every listing can be shared and reloaded. Each
 * change drops `page`, since page 3 of the old results means nothing now.
 */
export const useListingUrl = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      params.delete('page')
      const query = params.toString()
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams],
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

  return { searchParams, update, toggle, isPending }
}
