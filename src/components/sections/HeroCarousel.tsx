'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { BannerArt } from '@/components/sections/Banner'
import type { BannerData } from '@/lib/storefront/content'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 6000

export const HeroCarousel = ({ slides }: { slides: BannerData[] }) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = (delta: number) => setIndex((current) => (current + delta + slides.length) % slides.length)

  useEffect(() => {
    if (paused || slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  if (slides.length === 0) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative aspect-[1620/600] min-h-[240px] w-full overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={`${slide.image.url}-${slideIndex}`}
          aria-hidden={slideIndex !== index}
          inert={slideIndex !== index}
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            slideIndex === index ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <BannerArt
            banner={slide}
            variant="hero"
            priority={slideIndex === 0}
            sizes="(max-width: 1620px) 100vw, 1620px"
            className="rounded-none"
          />
        </div>
      ))}

      {slides.length > 1 && (
        <div className="absolute right-6 bottom-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="grid size-8 place-items-center rounded-full bg-light-100/70 text-dark-500 transition-colors hover:bg-light-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="grid size-8 place-items-center rounded-full bg-light-100/70 text-dark-500 transition-colors hover:bg-light-100"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </section>
  )
}
