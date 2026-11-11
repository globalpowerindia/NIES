'use client'

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { ProductCard, type ProductCardProps } from '@/components/product/ProductCard'
import { SectionHeading } from '@/components/sections/SectionHeading'
import { cn } from '@/lib/utils'

export type ProductCarouselProps = {
  eyebrow?: string
  title?: string
  products: ProductCardProps[]
  /** Where "View all" leads. Without one, the row just scrolls. */
  viewAllHref?: string
  /** Left/right scroll buttons beside "View all". On by default. */
  arrows?: boolean
}

export const ProductCarousel = ({
  eyebrow,
  title,
  products,
  viewAllHref,
  arrows = true,
}: ProductCarouselProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => setCanScroll(track.scrollWidth > track.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [products.length])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const step = card ? card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth
    track.scrollBy({ left: step * direction, behavior: 'smooth' })
  }

  const arrow =
    'grid size-9 place-items-center rounded-full border border-neutral-300 text-dark-500 transition-colors hover:bg-neutral-200'

  return (
    <section className="flex flex-col gap-4">
      {(eyebrow || title || viewAllHref || (arrows && canScroll)) && (
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow={eyebrow} title={title} />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="flex items-center gap-1 text-body3 font-medium text-brand-red-500 hover:underline md:text-body1"
              >
                View all
                <ArrowRight className="size-4 md:size-5" aria-hidden />
              </Link>
            )}
            {arrows && canScroll && (
              <div className="hidden items-center gap-2 md:flex">
                <button type="button" onClick={() => scrollByCard(-1)} aria-label="Scroll left" className={arrow}>
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" onClick={() => scrollByCard(1)} aria-label="Scroll right" className={arrow}>
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={trackRef}
        className="-mx-2 -my-3 flex snap-x snap-mandatory scroll-px-2 gap-3 overflow-x-auto px-2 py-3 [scrollbar-width:none] md:gap-3 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <ProductCard
            key={product.href}
            {...product}
            // Phones: two cards and a bit of the third. Wider: a quarter of the next card shows, which fills the row and hints there's more.
            // When they all fit, they share the width instead.
            className={cn(
              'w-[calc((100%-1.5rem)/2.2)] shrink-0 snap-start md:w-[calc((100%-2.25rem)/3.25)]',
              products.length > 5 ? 'lg:w-[calc((100%-3.75rem)/5.25)]' : 'lg:w-auto lg:min-w-0 lg:flex-1',
            )}
          />
        ))}
      </div>
    </section>
  )
}
