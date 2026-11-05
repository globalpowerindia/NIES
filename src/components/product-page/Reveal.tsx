'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import styles from './product-detail.module.css'

/**
 * Fades a section in as it scrolls into view. Only what starts below the screen
 * is hidden, and only once the browser can bring it back, so nothing on screen
 * flickers and the page still reads without scripts.
 */
export const Reveal = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (element.getBoundingClientRect().top < window.innerHeight) return

    element.classList.add(styles.hidden)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        element.classList.remove(styles.hidden)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      element.classList.remove(styles.hidden)
    }
  }, [])

  return (
    <div ref={ref} className={`${styles.reveal} min-w-0`}>
      {children}
    </div>
  )
}
