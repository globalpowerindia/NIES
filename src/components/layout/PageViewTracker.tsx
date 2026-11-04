'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const STARTED_KEY = 'ph:visit-started'

/** True once per browser tab. If storage is blocked, every page counts as an entry, which only skews sources. */
const startsVisit = (): boolean => {
  try {
    if (window.sessionStorage.getItem(STARTED_KEY)) return false
    window.sessionStorage.setItem(STARTED_KEY, '1')
  } catch {
    // Nothing to remember it in.
  }
  return true
}

/**
 * Counts each storefront page, including moves that don't reload the document.
 * The path only, never the query string: that's where search terms live.
 * Best effort: a lost count must never get in the shopper's way.
 */
export const PageViewTracker = () => {
  const pathname = usePathname()

  useEffect(() => {
    const entry = startsVisit()
    void fetch('/api/page-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname.slice(0, 200),
        entry,
        referrer: entry ? document.referrer.slice(0, 500) : '',
        utmSource: entry ? (new URLSearchParams(window.location.search).get('utm_source') ?? '').slice(0, 100) : '',
      }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
