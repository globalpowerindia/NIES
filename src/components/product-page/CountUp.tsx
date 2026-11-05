'use client'

import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 1000

/** Counts up to a real figure the first time it comes into view. The server renders the final figure. */
export const CountUp = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [shown, setShown] = useState(value)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / DURATION_MS, 1)
        const eased = 1 - (1 - progress) ** 3
        setShown(Math.round(value * eased))
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value])

  return (
    <span ref={ref} className="tabular-nums">
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      <span aria-hidden>
        {shown}
        {suffix}
      </span>
    </span>
  )
}
