import { BookOpen, Heart, IndianRupee, ShoppingCart, Smartphone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { AccountLink } from '@/components/layout/AccountLink'
import { CategoryNav } from '@/components/layout/CategoryNav'
import { HeaderSearch } from '@/components/layout/HeaderSearch'
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
  cartCount?: number
}

export const Header = ({
  siteName,
  logoUrl,
  offers,
  utilityLinks,
  categories,
  searchTiles,
  cartCount = 0,
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
                className="flex items-center gap-[7px] text-body3 transition-opacity hover:opacity-80"
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
      <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
        <Link href="/" className="shrink-0">
          <Image
            src={logoUrl}
            alt={siteName}
            width={147}
            height={58}
            priority
            className="h-[58px] w-auto object-contain"
          />
        </Link>

        <HeaderSearch tiles={searchTiles} />

        <div className="flex shrink-0 items-center gap-5 lg:gap-7">
          <Link href="/cart" className="relative text-dark-500 hover:text-brand-blue-500">
            <ShoppingCart className="size-8 lg:size-10" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 grid size-[22px] place-items-center rounded-full bg-brand-red-500 text-caption1 font-medium text-light-100">
                {cartCount}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Link>
          <Link href="/account/wishlist" className="text-dark-500 hover:text-brand-red-500">
            <Heart className="size-8 lg:size-10" strokeWidth={1.5} />
            <span className="sr-only">Wishlist</span>
          </Link>
          <AccountLink />
        </div>
      </div>
    </div>

    <CategoryNav categories={categories} />
  </header>
)
