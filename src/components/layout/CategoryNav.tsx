'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

export type NavCategory = {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

/** Long enough to cross a neighbouring item, or the gap into the menu, without it flickering. */
const OPEN_DELAY_MS = 120
const CLOSE_DELAY_MS = 220

/** A long list spreads across columns, so the menu doesn't run down the page. */
const columnsFor = (count: number) => (count > 10 ? 3 : count > 5 ? 2 : 1)

/**
 * The category bar under the header. The category you're browsing is
 * highlighted. From laptop width up, a category with subcategories opens a menu
 * on hover or keyboard focus. Its links are always in the page, so they're
 * crawlable, and the category itself stays a plain link.
 */
export const CategoryNav = ({ categories }: { categories: NavCategory[] }) => {
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const later = (next: string | null, delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(next), delay)
  }

  const close = () => {
    clearTimeout(timer.current)
    setOpen(null)
  }

  const leaveItem = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    // In this order: focusing the category opens its menu, and this closes it again.
    event.currentTarget.querySelector('a')?.focus()
    close()
  }

  return (
    <nav aria-label="Categories" className="hidden bg-brand-blue-100 md:block">
      <div className="flex justify-start gap-0 overflow-x-auto px-6 [scrollbar-width:none] lg:justify-center-safe lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {categories.map(({ label, href, children = [] }, index) => {
          const isHere = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
          const active = isHere(href) || children.some((child) => isHere(child.href))
          const isOpen = open === href
          const columns = columnsFor(children.length)
          return (
            <div
              key={href}
              className="relative"
              onMouseEnter={() => later(children.length > 0 ? href : null, OPEN_DELAY_MS)}
              onMouseLeave={() => later(null, CLOSE_DELAY_MS)}
              onFocus={() => {
                clearTimeout(timer.current)
                setOpen(children.length > 0 ? href : null)
              }}
              onBlur={leaveItem}
              onKeyDown={onKeyDown}
            >
              <Link
                href={href}
                onClick={close}
                aria-current={active ? 'page' : undefined}
                aria-expanded={children.length > 0 ? isOpen : undefined}
                className={cn(
                  'flex items-center gap-1 px-5 py-4 text-body2 whitespace-nowrap transition-colors',
                  active ? 'bg-brand-red-400 text-light-100' : 'text-dark-500 hover:text-brand-red-500',
                  isOpen && !active && 'bg-light-100 text-brand-red-500',
                )}
              >
                {label}
                {children.length > 0 && (
                  <ChevronDown
                    className={cn('hidden size-4 transition-transform lg:block', isOpen && 'rotate-180')}
                    aria-hidden
                  />
                )}
              </Link>

              {children.length > 0 && (
                <div
                  className={cn(
                    'absolute top-full z-40 hidden rounded-b-xl border-[0.5px] border-t-0 border-dark-100 bg-light-100 p-3 shadow-[0_12px_28px_#1c1c1c26]',
                    isOpen && 'lg:block',
                    index >= categories.length / 2 ? 'right-0' : 'left-0',
                    columns === 3 ? 'w-[52rem]' : columns === 2 ? 'w-[36rem]' : 'w-[20rem]',
                  )}
                >
                  <ul
                    className={cn(
                      'grid gap-x-3',
                      columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
                    )}
                  >
                    {children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={close}
                          aria-current={isHere(child.href) ? 'page' : undefined}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-body1 transition-colors hover:bg-light-500 hover:text-brand-red-500',
                            isHere(child.href) ? 'font-semibold text-brand-red-500' : 'text-dark-500',
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    onClick={close}
                    className="mt-2 block border-t-[0.5px] border-dark-100 px-3 pt-3 pb-1 text-body1 font-semibold text-brand-red-500 hover:underline"
                  >
                    View all {label}
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
