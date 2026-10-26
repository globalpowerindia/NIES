'use client'

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { SectionHeading } from '@/components/sections/SectionHeading'
import { ButtonLink } from '@/components/ui/button'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

export type CollectionItem = {
  href: string
  imageUrl: string
  name: string
  pricePaise: number
}

export type CollectionShowcaseProps = {
  eyebrow?: string
  title?: string
  description?: string
  featureImage: string
  items: CollectionItem[]
  ctaLabel?: string
  ctaHref?: string | null
}

type ScrollState = { pages: number; page: number; ratio: number; offset: number }

export const CollectionShowcase = ({
  eyebrow,
  title,
  description,
  featureImage,
  items,
  ctaLabel,
  ctaHref,
}: CollectionShowcaseProps) => {
  const trackRef = useRef<HTMLUListElement>(null)
  const [scroll, setScroll] = useState<ScrollState>({ pages: 1, page: 0, ratio: 1, offset: 0 })

  const update = useCallback(() => {
    const track = trackRef.current
    // A hidden or not-yet-laid-out track has no width to page against.
    if (!track || track.clientWidth === 0) return
    const scrollable = Math.max(0, track.scrollWidth - track.clientWidth)
    const pages = Math.max(1, Math.ceil(track.scrollWidth / track.clientWidth - 0.05))
    // The final page is clamped to the end of the track, rather than a full
    // viewport step. Compare against those reachable positions after snapping.
    const positions = Array.from({ length: pages }, (_, page) =>
      Math.min(page * track.clientWidth, scrollable),
    )
    const page = positions.reduce(
      (closest, position, index) =>
        Math.abs(position - track.scrollLeft) < Math.abs(positions[closest] - track.scrollLeft)
          ? index
          : closest,
      0,
    )
    setScroll({
      pages,
      page,
      ratio: Math.min(track.clientWidth / track.scrollWidth, 1),
      offset: scrollable > 0 ? track.scrollLeft / scrollable : 0,
    })
  }, [])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    const card = track?.querySelector('li')
    track?.scrollBy({ left: (card ? card.offsetWidth + 16 : track.clientWidth) * direction, behavior: 'smooth' })
  }

  const goToPage = (page: number) => {
    const track = trackRef.current
    track?.scrollTo({ left: page * track.clientWidth, behavior: 'smooth' })
  }

  const scrolls = scroll.pages > 1

  return (
    <section className="flex flex-col gap-4 bg-light-400 md:gap-8 md:pt-20 md:pb-10 lg:min-h-[61.25rem]">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} className="gap-4 [&>p]:max-w-[49.5rem]" />

      <div className="flex flex-col items-center gap-4 md:gap-6 lg:flex-row">
        <div className="relative h-[21.6875rem] w-full shrink-0 overflow-hidden rounded-2xl md:hidden lg:block lg:h-[38.25rem] lg:w-[36.75rem]">
          <Image src={featureImage} alt="" fill sizes="588px" className="object-cover" />
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 lg:h-[40.25rem]">
          <ul
            ref={trackRef}
            onScroll={update}
            className="flex w-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => (
              <Fragment key={item.href}>
                {index > 0 && <li aria-hidden className="w-px shrink-0 self-stretch bg-neutral-300" />}
                <li className="flex w-[14.8125rem] max-w-[85vw] shrink-0 snap-start flex-col items-center gap-4 pb-6 md:w-[23.1875rem]">
                  <Link
                    href={item.href}
                    className="flex h-[15.875rem] w-full items-center justify-center rounded-xl p-4 md:h-[18.75rem] lg:h-[24.625rem]"
                  >
                    <span className="relative block size-[11.875rem] md:size-[15.75rem]">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="252px" className="object-contain" />
                    </span>
                  </Link>
                  <p className="w-full text-center text-body1 font-medium text-balance text-dark-500">{item.name}</p>
                  <p className="text-label1 font-semibold text-dark-500">
                    {item.pricePaise > 0 ? formatCurrency(item.pricePaise, { showPaise: true }) : 'Price on request'}
                  </p>
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 py-1 text-body2 text-brand-blue-300 hover:underline"
                  >
                    Discover
                    <ArrowRight className="size-6" strokeWidth={1.5} />
                  </Link>
                </li>
              </Fragment>
            ))}
          </ul>

          {scrolls && (
            <div className="hidden items-start gap-1 md:flex" role="tablist" aria-label="Collection pages">
              {Array.from({ length: scroll.pages }, (_, page) => (
                <button
                  key={page}
                  type="button"
                  role="tab"
                  aria-selected={page === scroll.page}
                  aria-label={`Page ${page + 1}`}
                  onClick={() => goToPage(page)}
                  className={cn(
                    'h-2 rounded-[0.8125rem] transition-all',
                    page === scroll.page ? 'w-[2.125rem] bg-dark-400' : 'w-[1.125rem] bg-dark-100 hover:bg-dark-200',
                  )}
                />
              ))}
            </div>
          )}

          {ctaLabel && ctaHref && (
            <ButtonLink href={ctaHref} variant="blue" className="hidden md:inline-flex">
              {ctaLabel}
            </ButtonLink>
          )}
        </div>
      </div>

      {scrolls && (
        <div className="hidden items-center gap-4 md:flex">
          <div className="relative h-0.5 flex-1 bg-neutral-300">
            <div
              className="absolute inset-y-0 rounded-full bg-dark-500 transition-[left] duration-150"
              style={{
                width: `${scroll.ratio * 100}%`,
                left: `${scroll.offset * (1 - scroll.ratio) * 100}%`,
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
      )}
    </section>
  )
}
