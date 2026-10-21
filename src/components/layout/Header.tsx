import { BookOpen, Heart, IndianRupee, Smartphone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { CartLink } from '@/components/cart/CartLink'
import { AccountLink } from '@/components/layout/AccountLink'
import { CategoryNav } from '@/components/layout/CategoryNav'
import { HeaderSearch } from '@/components/layout/HeaderSearch'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { OffersTicker } from '@/components/layout/OffersTicker'
import type { TopMovingTile } from '@/components/layout/SearchPanel'

const ICONS = { rupee: IndianRupee, book: BookOpen, phone: Smartphone } as const

export type HeaderProps = {
  siteName: string
  logoUrl: string
  offers: string[]
  utilityLinks: { label: string; href: string; icon: keyof typeof ICONS; download: boolean }[]
  categories: { label: string; href: string }[]
  searchTiles: TopMovingTile[]
}

export const Header = ({
  siteName,
  logoUrl,
  offers,
  utilityLinks,
  categories,
  searchTiles,
}: HeaderProps) => (
  <header>
    <div className="bg-brand-blue-600 text-light-100">
      <div className="container-page flex items-center justify-between py-3">
        <OffersTicker offers={offers} />
        <nav className="hidden items-center gap-4 md:flex">
          {utilityLinks.map(({ label, href, icon, download }) => {
            const Icon = ICONS[icon]
            return (
              <Link
                key={`${label}-${href}`}
                href={href}
                target={download ? '_blank' : undefined}
                rel={download ? 'noopener' : undefined}
                className="flex items-center gap-[0.4375rem] text-body3 transition-opacity hover:opacity-80"
              >
                <Icon className="size-5" strokeWidth={1.5} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>

    <div className="bg-light-100">
      <div className="container-page relative flex flex-wrap items-center justify-between gap-x-4 gap-y-0 pt-4 md:gap-y-4 md:pb-4">
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

        <HeaderSearch tiles={searchTiles} />

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
    </div>

    <CategoryNav categories={categories} />
  </header>
)
