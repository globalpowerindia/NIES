'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'

export const MobileNavigation = ({ categories }: { categories: { label: string; href: string }[] }) => {
  const disclosure = useRef<HTMLDetailsElement>(null)

  return (
    <details
      ref={disclosure}
      className="group md:hidden"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && disclosure.current?.open) {
          disclosure.current.open = false
          disclosure.current.querySelector('summary')?.focus()
        }
      }}
    >
      <summary aria-label="Open navigation" className="flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden">
        <Menu className="size-6" aria-hidden />
      </summary>
      <nav
        aria-label="Mobile navigation"
        className="absolute inset-x-4 top-[65px] z-[60] flex max-h-[70vh] flex-col overflow-y-auto rounded-xl border border-neutral-300 bg-light-100 p-3 shadow-lg"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a') && disclosure.current) disclosure.current.open = false
        }}
      >
        <Link href="/account" className="rounded-lg px-3 py-3 text-body2 hover:bg-neutral-200">My Account</Link>
        {categories.map(({ label, href }) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-3 text-body2 hover:bg-neutral-200">{label}</Link>
        ))}
      </nav>
    </details>
  )
}
