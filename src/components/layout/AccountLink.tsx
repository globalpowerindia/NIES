'use client'

import { ChevronDown, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Me = { firstName: string | null; email: string | null; phone: string | null }

const ITEM =
  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-body3 text-dark-500 focus:bg-neutral-200 focus:text-dark-500 data-disabled:opacity-60'

const AUTH_PAGES = /^\/(login|register)(\/|$)/

/**
 * The header's account slot. Asks `/api/auth/me` from the browser so the
 * layout never reads the session cookie and pages stay static.
 */
export const AccountLink = () => {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((reply: { customer: Me | null }) => !cancelled && setMe(reply.customer))
      .catch(() => !cancelled && setMe(null))
    return () => {
      cancelled = true
    }
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    // A full reload, not router.push, so the cart and wishlist stores start over signed out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/')
  }

  if (!me) {
    const href =
      AUTH_PAGES.test(pathname) || pathname === '/'
        ? '/login'
        : `/login?next=${encodeURIComponent(pathname)}`
    return (
      <Link href={href} className="flex items-center gap-2 text-dark-500 hover:text-brand-blue-500">
        <User className="size-8 lg:size-10" strokeWidth={1.5} />
        {/* Kept invisible until we know, so a signed-in customer never sees "Login" flash. */}
        <span
          className={cn(
            'hidden text-body2 whitespace-nowrap lg:inline',
            me === undefined && 'invisible',
          )}
        >
          Login/Signup
        </span>
        <span className="sr-only lg:hidden">Login or sign up</span>
      </Link>
    )
  }

  const contact = me.phone ?? me.email
  const name = me.firstName || me.email?.split('@')[0] || 'Account'

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="group/account flex items-center gap-2 text-dark-500 outline-none hover:text-brand-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500">
        <User className="size-8 lg:size-10" strokeWidth={1.5} />
        <span className="hidden max-w-[8.75rem] truncate text-body2 lg:inline">Hi, {name}</span>
        <span className="sr-only lg:hidden">Your account</span>
        <ChevronDown
          className="hidden size-4 transition-transform group-data-[state=open]/account:rotate-180 lg:block"
          strokeWidth={2}
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-64 rounded-xl border border-neutral-300 bg-light-100 p-2 shadow-lg ring-0"
      >
        <DropdownMenuLabel className="border-b border-neutral-300 px-3 pt-2 pb-3 font-normal">
          <p className="truncate text-body2 font-medium text-dark-500">{me.firstName || 'Signed in'}</p>
          {contact && <p className="truncate text-body3 text-dark-300">{contact}</p>}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/account" className="mt-1">
            <User className="size-4" strokeWidth={1.75} aria-hidden />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={ITEM}
          disabled={signingOut}
          // Keep the menu open so "Signing out…" shows until the page reloads.
          onSelect={(event) => {
            event.preventDefault()
            void signOut()
          }}
        >
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
