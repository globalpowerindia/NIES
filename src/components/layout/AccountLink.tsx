'use client'

import { ChevronDown, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

type Me = { firstName: string | null; email: string | null; phone: string | null }

const AUTH_PAGES = /^\/(login|register)(\/|$)/

/**
 * The header's account slot. Asks `/api/auth/me` from the browser so the
 * layout never reads the session cookie and pages stay static.
 */
export const AccountLink = () => {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const signOut = async () => {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 text-dark-500 hover:text-brand-blue-500"
      >
        <User className="size-8 lg:size-10" strokeWidth={1.5} />
        <span className="hidden max-w-[140px] truncate text-body2 lg:inline">Hi, {name}</span>
        <span className="sr-only lg:hidden">Your account</span>
        <ChevronDown className="hidden size-4 lg:block" strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-64 rounded-xl border border-neutral-300 bg-light-100 p-2 shadow-lg"
        >
          <div className="border-b border-neutral-300 px-3 pt-2 pb-3">
            <p className="truncate text-body2 font-medium text-dark-500">
              {me.firstName || 'Signed in'}
            </p>
            {contact && <p className="truncate text-body3 text-dark-300">{contact}</p>}
          </div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body3 text-dark-500 hover:bg-neutral-200"
          >
            <User className="size-4" strokeWidth={1.75} aria-hidden />
            My Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-body3 text-dark-500 hover:bg-neutral-200 disabled:opacity-60"
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
