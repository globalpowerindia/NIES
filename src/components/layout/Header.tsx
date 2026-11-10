import { Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { CartLink } from '@/components/cart/CartLink'
import { AccountLink } from '@/components/layout/AccountLink'
import { CategoryNav, type NavCategory } from '@/components/layout/CategoryNav'
import { HeaderSearch } from '@/components/layout/HeaderSearch'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { OffersTicker, type OfferLine } from '@/components/layout/OffersTicker'
import { StickyHeader } from '@/components/layout/StickyHeader'
import type { TopMovingTile } from '@/components/layout/SearchPanel'

export type HeaderProps = {
  siteName: string
  logoUrl: string
  offers: OfferLine[]
  categories: NavCategory[]
  searchTiles: TopMovingTile[]
  searchHints: string[]
}

export const Header = ({
  siteName,
  logoUrl,
  offers,
  categories,
  searchTiles,
  searchHints,
}: HeaderProps) => (
  <>
    {/* Brand blue, brightening to the right like a spotlight, so the white offer button stands out. */}
    <div className="bg-linear-to-r from-brand-blue-600 from-40% via-brand-blue-500 via-75% to-brand-blue-300 text-light-100">
      <div className="container-page flex items-center justify-center py-2">
        <OffersTicker offers={offers} />
      </div>
    </div>

    {/* Logo, search, cart and account stay in view while scrolling; the offer strip and categories scroll away. */}
    <StickyHeader>
      <div className="container-page relative flex flex-wrap items-center justify-between gap-x-4 gap-y-0 pt-4 pb-3 md:gap-y-4 md:pb-4">
        <Link href="/" className="shrink-0">
          <Image
            src={logoUrl}
            alt={siteName}
            width={147}
            height={58}
            priority
            className="h-[2.0625rem] w-[5.25rem] object-contain md:h-[3.625rem] md:w-auto"
          />
        </Link>

        <HeaderSearch tiles={searchTiles} hints={searchHints} />

        <div className="flex shrink-0 items-center gap-4 md:gap-5 lg:gap-7">
          <CartLink />
          <Link href="/account/wishlist" className="text-dark-500 hover:text-brand-red-500">
            <Heart className="size-7 md:size-8 lg:size-10" strokeWidth={1.5} />
            <span className="sr-only">Wishlist</span>
          </Link>
          <div className="hidden md:block"><AccountLink /></div>
          <MobileNavigation categories={categories} />
        </div>
      </div>
    </StickyHeader>

    <CategoryNav categories={categories} />
  </>
)
