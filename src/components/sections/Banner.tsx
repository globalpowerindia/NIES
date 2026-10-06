'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import type { BannerData } from '@/lib/storefront/content'
import { cn } from '@/lib/utils'

export type BannerVariant = 'hero' | 'card' | 'feature'

type BannerArtProps = {
  banner: BannerData
  variant: BannerVariant
  sizes: string
  priority?: boolean
  className?: string
}

/**
 * Where the text block sits on each kind of banner, taken from the Figma
 * frames: hero 1620×600 (text at x 1139 / y 300), banner-row card 799×400
 * (x 526 / y 232, or x 57 on the left), feature 1620×500 (x 176 / y 175).
 */
const PLACEMENT: Record<BannerVariant, { left: string; right: string; top: string; width: string }> = {
  hero: { left: 'md:left-[7%]', right: 'md:left-[70.3%]', top: 'md:top-1/2', width: 'md:w-[28%]' },
  card: { left: 'md:left-[7.1%]', right: 'md:left-[65.8%]', top: 'md:top-[58%]', width: 'md:w-[33.7%]' },
  feature: { left: 'md:left-[10.9%]', right: 'md:right-[10.9%]', top: 'md:top-[35%]', width: 'md:w-[40%]' },
}

/**
 * Below md, right-hand text follows the mobile frames: hero 358×164 (text at
 * x 176 / y 78) and banner-row card 265×164 (x 117 / y 64). Everything else
 * falls back to a left-aligned, vertically centred block.
 */
const MOBILE_RIGHT: Partial<Record<BannerVariant, string>> = {
  hero: 'top-[47.5%] left-[49.2%] w-[39%]',
  card: 'top-[39%] left-[44.2%] right-4',
}
const MOBILE_DEFAULT = 'inset-y-0 left-5 w-[76%] justify-center'

const HEADING: Record<BannerVariant, string> = {
  hero: 'text-label2 font-semibold md:text-h2 md:font-medium',
  card: 'text-label2 font-semibold md:text-h5 md:font-medium',
  feature: 'text-h6 font-semibold md:text-h3 md:font-medium',
}

const SUBHEADING: Record<BannerVariant, string> = {
  hero: 'text-caption1 md:text-body2',
  card: 'text-caption1 md:text-body3',
  feature: 'font-mobile-caption text-caption1 md:font-sans md:text-body1',
}

/**
 * One banner: the artwork (text is part of the image), an optional live
 * overlay, and a single link around the lot. The button inside is a styled
 * span, not a second link, so there's never a link nested in a link.
 */
export const BannerArt = ({ banner, variant, sizes, priority, className }: BannerArtProps) => {
  const { image, mobileImage, overlay, href } = banner
  const place = PLACEMENT[variant]
  const mobilePlace = (overlay?.position === 'right' && MOBILE_RIGHT[variant]) || MOBILE_DEFAULT

  const art = (
    <>
      <Image
        src={image.url}
        alt={overlay?.heading ? '' : image.alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn('object-cover', mobileImage && 'hidden md:block')}
      />
      {mobileImage && (
        <Image
          src={mobileImage.url}
          alt={overlay?.heading ? '' : mobileImage.alt || image.alt}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover md:hidden"
        />
      )}
      {overlay?.shade && (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 from-black/65 via-black/25 to-transparent',
            overlay.position === 'right' ? 'bg-gradient-to-l' : 'bg-gradient-to-r',
          )}
        />
      )}
      {overlay && (
        <div
          className={cn(
            'absolute flex flex-col gap-[9px]',
            mobilePlace,
            'md:inset-y-auto md:right-auto md:justify-start md:gap-2.5',
            overlay.position === 'right' ? place.right : place.left,
            place.top,
            place.width,
            variant === 'feature' && 'gap-4 md:gap-4',
          )}
        >
          <div className="flex flex-col gap-[9px] md:gap-2">
            {overlay.heading && (
              <h2
                className={cn(
                  'whitespace-pre-line',
                  HEADING[variant],
                  overlay.textTone === 'dark' ? 'text-dark-500' : 'text-light-100',
                )}
              >
                {overlay.heading}
              </h2>
            )}
            {overlay.subheading && (
              <p
                className={cn(
                  SUBHEADING[variant],
                  overlay.textTone === 'dark' ? 'text-dark-400' : 'text-dark-100 md:text-dark-200',
                )}
              >
                {overlay.subheading}
              </p>
            )}
          </div>
          {overlay.buttonLabel && (
            <span
              className={cn(
                buttonVariants({ variant: overlay.buttonStyle }),
                'h-8 self-start px-6 text-[12px] leading-4 font-normal md:h-10 md:text-body2 md:font-medium',
                variant === 'feature' && 'h-10',
              )}
            >
              {overlay.buttonLabel}
            </span>
          )}
        </div>
      )}
    </>
  )

  const frame = cn('relative block size-full overflow-hidden rounded-2xl bg-neutral-200', className)

  return href ? (
    <Link
      href={href}
      className={cn(frame, 'transition-opacity hover:opacity-95')}
      // With live text the link reads its heading; artwork-only banners need the alt text.
      aria-label={overlay?.heading ? undefined : image.alt || undefined}
    >
      {art}
    </Link>
  ) : (
    <div className={frame}>{art}</div>
  )
}

export const BannerRow = ({ banners }: { banners: BannerData[] }) => {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  if (banners.length === 0) return null
  const single = banners.length === 1
  // Artwork-only rows are the promo banners (Figma mobile 340×182, no dots);
  // rows with live text are the hero's 265×164 companions, tucked under it.
  const promo = banners.every((banner) => !banner.overlay)
  const dots = !single && !promo
  return (
    <section className={cn('flex flex-col gap-[13px]', !promo && '-mt-2.5 -mb-0.5 md:my-0')}>
      <div
        ref={track}
        onScroll={() => {
          const element = track.current
          if (!element) return
          const step = (element.firstElementChild as HTMLElement | null)?.offsetWidth ?? 265
          setActive(Math.min(banners.length - 1, Math.round(element.scrollLeft / (step + 16))))
        }}
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:gap-[22px]',
          promo ? 'gap-3' : 'gap-4',
          !single && 'lg:grid-cols-2',
        )}
      >
      {banners.map((banner, index) => (
        <div
          key={`${banner.image.url}-${index}`}
          // A taller crop on phones so live text still fits; no min-height, which
          // would push the card wider than the screen through its aspect ratio.
          className={cn(
            'min-w-0 shrink-0 snap-start md:w-full',
            promo ? 'aspect-[340/182] w-[min(340px,87vw)]' : 'aspect-[265/164] w-[265px]',
            single ? 'md:aspect-[1620/400]' : 'md:aspect-[799/400]',
          )}
        >
          <BannerArt
            banner={banner}
            variant={single ? 'feature' : 'card'}
            sizes={single ? '100vw' : '(max-width: 1024px) 100vw, 800px'}
            className={promo ? undefined : 'max-md:rounded-xl'}
          />
        </div>
      ))}
      </div>
      {dots && (
        <div className="flex h-[9px] items-center justify-center gap-[3px] md:hidden" aria-label="Promotional banners">
          {banners.map((banner, index) => (
            <button
              key={`${banner.image.url}-${index}`}
              type="button"
              aria-label={`Show promotional banner ${index + 1}`}
              aria-current={active === index ? 'true' : undefined}
              className={cn('size-[9px] rounded-full', active === index ? 'bg-dark-500' : 'bg-neutral-300')}
              onClick={() => {
                const element = track.current
                const child = element?.children[index] as HTMLElement | undefined
                if (element && child) element.scrollTo({ left: child.offsetLeft - (element.firstElementChild as HTMLElement).offsetLeft, behavior: 'smooth' })
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export const WideBanner = ({ banner, shape }: { banner: BannerData; shape: 'feature' | 'strip' }) => (
  <section
    className={cn(
      'w-full',
      shape === 'strip' ? 'aspect-[358/147] md:aspect-[1620/239] md:min-h-[120px]' : 'aspect-[358/182] md:aspect-[1620/500] md:min-h-[260px]',
    )}
  >
    <BannerArt banner={banner} variant="feature" sizes="100vw" />
  </section>
)
