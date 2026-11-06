'use client'

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** `alsoIds` are further sections that count as this link while being read. */
export type NavSection = { id: string; label: string; alsoIds?: string[] }

const jump = (event: MouseEvent, id: string) => {
  const section = document.getElementById(id)
  if (!section) return
  event.preventDefault()
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: still ? 'auto' : 'smooth' })
}

/** A link further up the page that glides down to a section. */
export const JumpLink = ({
  to,
  className,
  children,
}: {
  to: string
  className?: string
  children: ReactNode
}) => (
  <a href={`#${to}`} onClick={(event) => jump(event, to)} className={className}>
    {children}
  </a>
)

/** Jump links that stay at the top of the page and follow the section being read. */
export const SectionNav = ({ sections }: { sections: NavSection[] }) => {
  const [active, setActive] = useState(sections[0]?.id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (!visible) return
        const owner = sections.find(
          ({ id, alsoIds }) => id === visible.target.id || alsoIds?.includes(visible.target.id),
        )
        if (owner) setActive(owner.id)
      },
      { rootMargin: '-15% 0px -75% 0px' },
    )
    sections
      .flatMap(({ id, alsoIds = [] }) => [id, ...alsoIds])
      .forEach((id) => {
        const section = document.getElementById(id)
        if (section) observer.observe(section)
      })
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav
      aria-label="On this page"
      className="sticky top-0 z-30 -mx-4 overflow-x-auto bg-light-400/95 px-4 backdrop-blur [scrollbar-width:none] lg:mx-0 lg:rounded-xl lg:border-[0.5px] lg:border-dark-100 lg:bg-light-100/95 lg:px-2 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max gap-1">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => jump(event, id)}
              aria-current={active === id ? 'true' : undefined}
              className={cn(
                'block border-b-2 px-3 py-3 text-body3 font-medium whitespace-nowrap transition-colors lg:px-2.5 lg:text-body1',
                active === id
                  ? 'border-brand-red-500 text-dark-500'
                  : 'border-transparent text-dark-300 hover:text-dark-500',
              )}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
