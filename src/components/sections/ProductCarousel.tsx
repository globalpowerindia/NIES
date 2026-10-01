'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ProductCard, type ProductCardProps } from '@/components/product/ProductCard'
import { SectionHeading } from '@/components/sections/SectionHeading'

export type ProductCarouselProps = {
  eyebrow?: string
  title?: string
  description?: string
  products: ProductCardProps[]
}

export const ProductCarousel = ({
  eyebrow,
  title,
  description,
  products,
}: ProductCarouselProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState({ ratio: 0, offset: 0 })

  const updateProgress = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const scrollable = track.scrollWidth - track.clientWidth
    const ratio = track.clientWidth / track.scrollWidth
    setProgress({ ratio, offset: scrollable > 0 ? track.scrollLeft / scrollable : 0 })
  }, [])

  useEffect(() => {
    updateProgress()
    window.addEventListener('resize', updateProgress)
    return () => window.removeEventListener('resize', updateProgress)
  }, [updateProgress])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const step = card ? card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth
    track.scrollBy({ left: step * direction, behavior: 'smooth' })
  }

  return (
    // Without a heading (e.g. deals directly under the offer strip) the section
    // tucks up against whatever introduces it, as in the design.
    <section className={eyebrow || title || description ? 'flex flex-col gap-4 md:gap-10 md:pt-20 md:pb-10' : 'flex flex-col py-5'}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />

      <div className="flex flex-col gap-10 py-6 md:py-0">
        <div
          ref={trackRef}
          onScroll={updateProgress}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto md:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <ProductCard
              key={product.href}
              {...product}
              className="w-[258px] shrink-0 snap-start md:w-[298px]"
            />
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <div className="relative h-0.5 flex-1 bg-neutral-300">
            <div
              className="absolute inset-y-0 rounded-full bg-dark-500 transition-[left] duration-150"
              style={{
                width: `${Math.min(progress.ratio, 1) * 100}%`,
                left: `${progress.offset * (1 - Math.min(progress.ratio, 1)) * 100}%`,
              }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              aria-label="Scroll left"
              className="grid size-8 place-items-center rounded-full border border-neutral-300 text-dark-500 transition-colors hover:bg-neutral-200"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label="Scroll right"
              className="grid size-8 place-items-center rounded-full border border-neutral-300 text-dark-500 transition-colors hover:bg-neutral-200"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
