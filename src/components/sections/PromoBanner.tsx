import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { PromoBannerData, PromoBannerItem } from '@/lib/storefront/promo-banners'
import { cn } from '@/lib/utils'

/*
 * One banner's shape, matching the suggested artwork: 1250 × 250 alone,
 * 620 × 250 in twos, 410 × 250 in threes. The whole row is then 5:1, about
 * 250px tall beside the filters, like a marketplace sponsored strip.
 * Written out in full so Tailwind sees every class.
 */
const CELL_ASPECT: Record<number, string> = { 1: 'aspect-[5/1]', 2: 'aspect-[62/25]', 3: 'aspect-[41/25]' }
const CELL_ASPECT_MD: Record<number, string> = { 1: 'md:aspect-[5/1]', 2: 'md:aspect-[62/25]', 3: 'md:aspect-[41/25]' }
const DESKTOP_COLUMNS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500'

const Frame = ({
  item,
  bannerId,
  className,
  children,
}: {
  item: PromoBannerItem
  bannerId: number
  className: string
  children: ReactNode
}) => {
  if (!item.href)
    return (
      <div data-promo-banner={bannerId} className={className}>
        {children}
      </div>
    )
  return /^https?:\/\//.test(item.href) ? (
    <a data-promo-banner={bannerId} href={item.href} target="_blank" rel="noopener noreferrer" className={cn(className, focusRing)}>
      {children}
    </a>
  ) : (
    <Link data-promo-banner={bannerId} href={item.href} className={cn(className, focusRing)}>
      {children}
    </Link>
  )
}

/**
 * A row of one to three staff-placed banners (Storefront → Promo banners),
 * side by side. Phones swipe through them; each uses its phone artwork (5:2)
 * when there is one, otherwise the desktop artwork in its own shape.
 * `width` is the space the row gets on a wide screen, for picking image sizes.
 */
export const PromoBanner = ({ banner, width }: { banner: PromoBannerData; width: number }) => {
  const items = banner.items.slice(0, 3)
  const count = items.length
  const desktopSizes = `(min-width: 768px) ${Math.round(width / count)}px, ${count > 1 ? 85 : 100}vw`

  return (
    <div
      className={cn(
        // Phones: a row you swipe, each banner most of the screen wide so the next one peeks in.
        'flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'md:grid md:gap-4 md:overflow-visible',
        DESKTOP_COLUMNS[count],
      )}
    >
      {items.map((item, index) => (
        <Frame
          key={index}
          item={item}
          bannerId={banner.id}
          className={cn(
            'relative block shrink-0 snap-start overflow-hidden rounded-xl bg-light-100',
            count > 1 ? 'w-[85%] md:w-auto' : 'w-full',
            item.mobileImage ? 'aspect-[5/2]' : CELL_ASPECT[count],
            CELL_ASPECT_MD[count],
          )}
        >
          <Image
            src={item.image.url}
            alt={item.image.alt}
            fill
            sizes={desktopSizes}
            className={cn('object-cover', item.mobileImage && 'hidden md:block')}
          />
          {item.mobileImage && (
            <Image
              src={item.mobileImage.url}
              alt={item.mobileImage.alt || item.image.alt}
              fill
              sizes={count > 1 ? '85vw' : '100vw'}
              className="object-cover md:hidden"
            />
          )}
        </Frame>
      ))}
    </div>
  )
}
