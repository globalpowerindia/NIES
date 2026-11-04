'use client'

import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { viewersLine } from '@/lib/demand-line'

const REFRESH_MS = 60_000

/**
 * How many people have this product open, from real page views. Fetched in the
 * browser, as product pages are cached and this changes by the minute. Nothing
 * shows when the shopper is the only one here.
 */
export const ProductViewers = ({ productId }: { productId: number }) => {
  const [viewers, setViewers] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const refresh = async () => {
      if (document.hidden) return
      try {
        const response = await fetch(`/api/products/viewers?id=${productId}`, { signal: controller.signal })
        if (!response.ok) return
        const data: { viewers?: number } = await response.json()
        setViewers(data.viewers ?? 0)
      } catch {
        // Aborted or offline: the line is only a nicety, so keep what's shown.
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [productId])

  const line = viewersLine(viewers)
  return line ? (
    <p className="flex items-center gap-1.5 text-body3 font-medium text-dark-400 lg:text-body2">
      <Users className="size-4 shrink-0 text-brand-blue-500 lg:size-5" aria-hidden />
      {line}
    </p>
  ) : null
}
