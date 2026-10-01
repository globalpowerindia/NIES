'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/** The category bar under the header. The category you're browsing is highlighted. */
export const CategoryNav = ({ categories }: { categories: { label: string; href: string }[] }) => {
  const pathname = usePathname()
  return (
    <nav aria-label="Categories" className="hidden bg-brand-blue-100 md:block">
      <div className="flex justify-start gap-0 overflow-x-auto px-6 lg:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map(({ label, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'px-5 py-4 text-body2 whitespace-nowrap transition-colors',
                active ? 'bg-brand-red-400 text-light-100' : 'text-dark-500 hover:text-brand-blue-500',
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
