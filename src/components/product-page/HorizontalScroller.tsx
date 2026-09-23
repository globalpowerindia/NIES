'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const arrow =
  'absolute z-10 grid size-10 place-items-center rounded-full bg-brand-blue-400 text-light-100 shadow-md transition-opacity hover:bg-brand-blue-500'

/**
 * A sideways-scrolling area with round prev/next buttons that only appear
 * when there is something further in that direction.
 */
export const HorizontalScroller = ({
  children,
  label,
  arrowTop = '50%',
  step = 300,
}: {
  children: ReactNode
  label: string
  arrowTop?: string
  step?: number
}) => {
  const area = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = area.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
  }, [])

  useEffect(() => {
    measure()
    const el = area.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const scroll = (direction: 1 | -1) => area.current?.scrollBy({ left: direction * step, behavior: 'smooth' })

  return (
    <div className="relative">
      <div ref={area} onScroll={measure} role="region" aria-label={label} tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand-blue-500">
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        style={{ top: arrowTop }}
        className={cn(arrow, 'left-2 -translate-y-1/2 lg:left-[280px]', edges.start && 'pointer-events-none opacity-0')}
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        style={{ top: arrowTop }}
        className={cn(arrow, 'right-2 -translate-y-1/2', edges.end && 'pointer-events-none opacity-0')}
      >
        <ChevronRight className="size-6" />
      </button>
    </div>
  )
}
