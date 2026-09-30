'use client'

import { Heart, LogOut, MapPin, Package, Smartphone, User, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/account', label: 'My Profile', icon: User },
  { href: '/account/addresses', label: 'My Address', icon: MapPin },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/app', label: 'Download App', icon: Smartphone },
]

const itemClass = 'flex w-full items-center gap-4 py-3 pr-6 text-body2 font-medium'

/** The account pages' left rail, from Figma node 1069:20502. */
export const AccountSidebar = ({ name, contact }: { name: string; contact: string | null }) => {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    window.location.assign('/')
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 rounded-lg bg-light-100 p-5 lg:w-70">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-blue-400 text-h4 font-semibold text-light-100"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-h6 font-medium text-dark-500">{name}</p>
          {contact && <p className="truncate text-body2 text-dark-300">{contact}</p>}
        </div>
      </div>

      <hr className="border-neutral-300" />

      <nav aria-label="Your account">
        <ul className="flex flex-col gap-4">
          {LINKS.map(({ href, label, icon: Icon }) => {
            // Sub-pages (Add Address, an order) keep their section highlighted.
            const active = href === '/account' ? pathname === href : pathname.startsWith(href)
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
        {signingOut ? 'Logging out…' : 'Logout'}
      </button>
    </aside>
  )
}
