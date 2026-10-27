'use client'

import { Heart, LogOut, MapPin, Package, Smartphone, User, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/account', label: 'My Profile', icon: User },
  { href: '/account/addresses', label: 'My Address', icon: MapPin },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/app', label: 'Download App', icon: Smartphone },
]

const itemClass = 'flex w-full items-center gap-4 py-3 pr-6 text-body2 font-medium'

const Avatar = ({ name, className }: { name: string; className: string }) => (
  <span
    aria-hidden
    className={cn(
      'grid shrink-0 place-items-center rounded-full bg-brand-blue-400 font-semibold text-light-100',
      className,
    )}
  >
    {name.charAt(0).toUpperCase()}
  </span>
)

/**
 * The account pages' navigation. From lg up it is the left rail from Figma
 * node 1069:20502. Below that the rail would push the page's own content off
 * the first screen, so phones get a short profile row with Logout and a row of
 * tabs that scrolls sideways instead.
 */
export const AccountSidebar = ({ name, contact }: { name: string; contact: string | null }) => {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)
  const activeTab = useRef<HTMLAnchorElement>(null)

  // Sub-pages (Add Address, an order) keep their section highlighted.
  const isActive = (href: string) => (href === '/account' ? pathname === href : pathname.startsWith(href))

  // Bring the current tab into view when it starts off-screen, e.g. Wishlist on a narrow phone.
  useEffect(() => {
    activeTab.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  const signOut = async () => {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    // A full reload, not router.push, so the cart and wishlist stores start over signed out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/')
  }

  const logoutLabel = signingOut ? 'Logging out…' : 'Logout'

  return (
    <>
      <div className="flex w-full flex-col gap-4 lg:hidden">
        <div className="flex items-center gap-3 rounded-lg bg-light-100 p-4">
          <Avatar name={name} className="size-10 text-h6" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label1 font-medium text-dark-500">{name}</p>
            {contact && <p className="truncate text-body3 text-dark-300">{contact}</p>}
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-body3 font-medium text-brand-red-400 hover:text-brand-red-500 disabled:opacity-60"
          >
            <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
            {logoutLabel}
          </button>
        </div>

        <nav aria-label="Your account">
          <ul className="mx-[calc(-1*var(--page-gutter))] flex gap-2 overflow-x-auto px-(--page-gutter) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <li key={href} className="shrink-0">
                  <Link
                    ref={active ? activeTab : undefined}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 text-body3 font-medium whitespace-nowrap',
                      active
                        ? 'border-brand-blue-400 bg-brand-blue-100 text-brand-blue-400'
                        : 'border-neutral-300 bg-light-100 text-dark-400',
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <aside className="hidden w-70 shrink-0 flex-col gap-4 rounded-lg bg-light-100 p-5 lg:flex">
        <div className="flex items-center gap-3">
          <Avatar name={name} className="size-12 text-h4" />
          <div className="min-w-0">
            <p className="truncate text-h6 font-medium text-dark-500">{name}</p>
            {contact && <p className="truncate text-body2 text-dark-300">{contact}</p>}
          </div>
        </div>

        <hr className="border-neutral-300" />

        <nav aria-label="Your account">
          <ul className="flex flex-col gap-4">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      itemClass,
                      active
                        ? 'border-l-2 border-brand-blue-400 bg-brand-blue-100 pr-1 pl-2 text-brand-blue-400'
                        : 'text-dark-400 transition-colors hover:text-brand-blue-400',
                    )}
                  >
                    <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <hr className="border-neutral-300" />

        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className={cn(itemClass, 'text-brand-red-400 hover:text-brand-red-500 disabled:opacity-60')}
        >
          <LogOut className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
          {logoutLabel}
        </button>
      </aside>
    </>
  )
}
