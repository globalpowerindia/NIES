import Image from 'next/image'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/Button'
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
 * Below md everything falls back to a left-aligned, vertically centred block.
 */
const PLACEMENT: Record<BannerVariant, { left: string; right: string; top: string; width: string }> = {
  hero: { left: 'md:left-[7%]', right: 'md:left-[70.3%]', top: 'md:top-1/2', width: 'md:w-[28%]' },
  card: { left: 'md:left-[7.1%]', right: 'md:left-[65.8%]', top: 'md:top-[58%]', width: 'md:w-[33.7%]' },
  feature: { left: 'md:left-[10.9%]', right: 'md:right-[10.9%]', top: 'md:top-[35%]', width: 'md:w-[40%]' },
}

const HEADING: Record<BannerVariant, string> = {
  hero: 'text-h5 md:text-h2',
  card: 'text-h5',
  feature: 'text-h5 md:text-h3',
}

const SUBHEADING: Record<BannerVariant, string> = {
  hero: 'text-body2',
  card: 'text-body3',
  feature: 'text-body2 md:text-body1',
}

/**
 * One banner: the artwork (text is part of the image), an optional live
 * overlay, and a single link around the lot. The button inside is a styled
 * span, not a second link, so there's never a link nested in a link.
 */
export const BannerArt = ({ banner, variant, sizes, priority, className }: BannerArtProps) => {
  const { image, mobileImage, overlay, href } = banner
  const place = PLACEMENT[variant]

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
            'absolute inset-y-0 left-6 flex w-[60%] flex-col justify-center gap-2.5',
            'md:inset-y-auto md:justify-start',
            overlay.position === 'right' ? place.right : place.left,
            place.top,
            place.width,
            variant === 'feature' && 'md:gap-4',
          )}
        >
          <div className="flex flex-col gap-2">
            {overlay.heading && (
              <h2
                className={cn(
                  'font-medium whitespace-pre-line',
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
                  overlay.textTone === 'dark' ? 'text-dark-400' : 'text-dark-200',
                )}
              >
                {overlay.subheading}
              </p>
            )}
          </div>
          {overlay.buttonLabel && (
            <span className={cn(buttonVariants({ variant: overlay.buttonStyle }), 'self-start')}>
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
  if (banners.length === 0) return null
  const single = banners.length === 1
  return (
    <section className={cn('my-5 grid gap-6', !single && 'lg:grid-cols-2')}>
      {banners.map((banner, index) => (
        <div
          key={`${banner.image.url}-${index}`}
          // A taller crop on phones so live text still fits; no min-height, which
          // would push the card wider than the screen through its aspect ratio.
          className={cn(
            'w-full min-w-0 aspect-[16/10]',
            single ? 'md:aspect-[1620/400]' : 'md:aspect-[799/400]',
          )}
        >
          <BannerArt
            banner={banner}
            variant={single ? 'feature' : 'card'}
            sizes={single ? '100vw' : '(max-width: 1024px) 100vw, 800px'}
          />
        </div>
      ))}
    </section>
  )
}

export const WideBanner = ({ banner, shape }: { banner: BannerData; shape: 'feature' | 'strip' }) => (
  <section
    className={cn(
      'my-5 w-full',
      shape === 'strip' ? 'aspect-[1620/239] min-h-[120px]' : 'aspect-[1620/500] min-h-[260px]',
    )}
  >
    <BannerArt banner={banner} variant="feature" sizes="100vw" />
  </section>
)
