'use client'

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Image, { getImageProps } from 'next/image'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { HoverPrefetchLink } from '@/components/product/HoverPrefetchLink'
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
  featureImage?: string
  /** Plays muted on a loop in place of the image; the image becomes its poster. */
  featureVideo?: { url: string; mimeType?: string } | null
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
  featureVideo,
  items,
  ctaLabel,
  ctaHref,
}: CollectionShowcaseProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Nothing downloads until the video is nearly on screen, and it stops when it scrolls away.
  // Visitors who turn off motion get the still poster instead of a looping video.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    let near = false
    const apply = () => (near && !query.matches ? video.play().catch(() => {}) : video.pause())
    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting
        apply()
      },
      { rootMargin: '200px' },
    )
    observer.observe(video)
    query.addEventListener('change', apply)
    return () => {
      observer.disconnect()
      query.removeEventListener('change', apply)
    }
  }, [featureVideo?.url])

  // A resized copy: the poster shows before anything else here, and originals can be large.
  const posterUrl = featureImage
    ? getImageProps({ src: featureImage, alt: '', width: 588, height: 347, quality: 75 }).props.src
    : undefined

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
    <section className="flex flex-col gap-4 bg-light-400 md:gap-6">
      <SectionHeading eyebrow={eyebrow} title={title} description={description}  />

      <div className="flex flex-col items-center gap-4 md:gap-6 lg:flex-row">
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-2xl md:hidden lg:block lg:aspect-auto lg:h-[30rem] lg:w-[30rem]">
          {featureVideo ? (
            <video
              ref={videoRef}
              key={featureVideo.url}
              muted
              loop
              playsInline
              preload="none"
              poster={posterUrl}
              aria-hidden
              className="absolute inset-0 size-full object-cover"
            >
              <source src={featureVideo.url} type={featureVideo.mimeType} />
            </video>
          ) : (
            featureImage && <Image src={featureImage} alt="" fill sizes="588px" className="object-cover" />
          )}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4">
          <ul
            ref={trackRef}
            onScroll={update}
            className="-my-3 flex w-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => (
              <Fragment key={item.href}>
                {index > 0 && <li aria-hidden className="w-px shrink-0 self-stretch bg-neutral-300" />}
                <li className="flex w-[calc((100%-2rem)/2.2)] shrink-0 snap-start flex-col items-center gap-2 pb-4 md:w-[19rem] md:gap-4 md:pb-6">
                  <HoverPrefetchLink
                    href={item.href}
                    className="card-lift flex aspect-square w-full items-center justify-center rounded-xl bg-light-100 p-2 md:aspect-auto md:h-[15rem] md:p-4"
                  >
                    <span className="relative block size-full md:size-[13rem]">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="252px" className="object-contain" />
                    </span>
                  </HoverPrefetchLink>
                  <p className="w-full text-center text-body3 font-medium text-balance text-dark-500 md:text-body1">{item.name}</p>
                  <p className="text-body3 font-semibold text-dark-500 md:text-label1">
                    {item.pricePaise > 0 ? formatCurrency(item.pricePaise, { showPaise: true }) : 'Price on request'}
                  </p>
                  <HoverPrefetchLink
                    href={item.href}
                    className="flex items-center gap-1 py-1 text-body3 text-brand-blue-300 hover:underline md:text-body2"
                  >
                    Discover
                    <ArrowRight className="size-4 md:size-6" strokeWidth={1.5} />
                  </HoverPrefetchLink>
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
