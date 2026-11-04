'use client'

import { useEffect, useState } from 'react'

import type { LiveVisitors as LiveData } from '@/lib/traffic'

const REFRESH_MS = 30_000

/**
 * Visitors on the shop right now. Checks again every 30 seconds, and not at all
 * while the tab is in the background, so a dashboard left open overnight
 * doesn't keep the database awake.
 */
export const LiveVisitors = ({ initial }: { initial: LiveData }) => {
  const [live, setLive] = useState(initial)

  useEffect(() => {
    const refresh = async () => {
      if (document.hidden) return
      try {
        const response = await fetch('/api/traffic/live', { cache: 'no-store' })
        if (response.ok) setLive(await response.json())
      } catch {
        // Offline for a moment: keep showing the last count until the next try.
      }
    }
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return (
    <section className="gpd__panel gpd__live" aria-live="polite">
      <div>
        <span className="gpd__livedot" aria-hidden />
        <b>{live.visitors}</b>
        <span>{live.visitors === 1 ? 'visitor' : 'visitors'} on the shop now</span>
        <small>Active in the last 5 minutes</small>
      </div>
      {live.pages.length > 0 && (
        <ul>
          {live.pages.map((page) => (
            <li key={page.path}>
              <span>{page.path}</span>
              <b>{page.visitors}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
