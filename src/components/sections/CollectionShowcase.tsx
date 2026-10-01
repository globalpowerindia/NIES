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
    if (!track) return
    const scrollable = track.scrollWidth - track.clientWidth
    setScroll({
      pages: Math.max(1, Math.ceil(track.scrollWidth / track.clientWidth - 0.05)),
      page: Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)),
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
    <section className="flex flex-col gap-8 bg-light-400 pt-20 pb-10">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} className="gap-4 [&>p]:max-w-[792px]" />

      <div className="flex flex-col items-center gap-6 lg:flex-row">
        <div className="relative hidden h-[612px] w-[588px] shrink-0 overflow-hidden rounded-2xl lg:block">
          <Image src={featureImage} alt="" fill sizes="588px" className="object-cover" />
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 lg:h-[644px]">
          <ul
            ref={trackRef}
            onScroll={update}
            className="flex w-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => (
              <Fragment key={item.href}>
                {index > 0 && <li aria-hidden className="w-px shrink-0 self-stretch bg-neutral-300" />}
                <li className="flex w-[371px] max-w-[85vw] shrink-0 snap-start flex-col items-center gap-4 pb-6">
                  <Link
                    href={item.href}
                    className="flex h-[300px] w-full items-center justify-center rounded-xl p-4 lg:h-[394px]"
                  >
                    <span className="relative block size-[252px]">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="252px" className="object-contain" />
                    </span>
                  </Link>
                  <p className="w-full text-center text-body1 font-medium text-balance text-dark-500">{item.name}</p>
                  <p className="text-label1 font-semibold text-dark-500">
                    {formatCurrency(item.pricePaise, { showPaise: true })}
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
            <div className="flex items-start gap-1" role="tablist" aria-label="Collection pages">
              {Array.from({ length: scroll.pages }, (_, page) => (
                <button
                  key={page}
                  type="button"
                  role="tab"
                  aria-selected={page === scroll.page}
                  aria-label={`Page ${page + 1}`}
                  onClick={() => goToPage(page)}
                  className={cn(
                    'h-2 rounded-[13px] transition-all',
                    page === scroll.page ? 'w-[34px] bg-dark-400' : 'w-[18px] bg-dark-100 hover:bg-dark-200',
                  )}
                />
              ))}
            </div>
          )}

          {ctaLabel && ctaHref && (
            <ButtonLink href={ctaHref} variant="blue">
              {ctaLabel}
            </ButtonLink>
          )}
        </div>
      </div>

      {scrolls && (
        <div className="flex items-center gap-4">
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
