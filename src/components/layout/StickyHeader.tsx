'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The header row that stays at the top while the page scrolls. Its height is
 * published as `--header-h` on the root element, so other sticky parts (the
 * product page's section tabs, photos and buy box, the cart and checkout
 * summaries) and jump links sit just below it rather than underneath.
 */
export const StickyHeader = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--header-h', `${element.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--header-h')
    }
  }, [])

  // A shadow only once it's floating over the page.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={ref}
      className={cn(
        'sticky top-0 z-40 bg-light-100 transition-shadow duration-200',
        scrolled && 'shadow-[0_4px_14px_#1c1c1c1f]',
      )}
    >
      {children}
    </header>
  )
}
