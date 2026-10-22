'use client'

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type TabPanel = { id: string; label: string; content: ReactNode }

/**
 * The tab strip and its card (Figma 885:46492). Panels arrive rendered on the
 * server and are only shown or hidden here, so every tab's text is in the page
 * for search engines. Arrow keys move between tabs, as WAI-ARIA tabs expect.
 */
export const ProductTabsClient = ({ panels }: { panels: TabPanel[] }) => {
  const [active, setActive] = useState(panels[0]?.id)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (event: KeyboardEvent, index: number) => {
    const last = panels.length - 1
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    setActive(panels[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <section className="flex flex-col">
      <div
        role="tablist"
        aria-label="Product details"
        className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {panels.map((panel, index) => {
          const selected = panel.id === active
          return (
            <button
              key={panel.id}
              ref={(element) => {
                tabs.current[index] = element
              }}
              type="button"
              role="tab"
              id={`tab-${panel.id}`}
              aria-selected={selected}
              aria-controls={`panel-${panel.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(panel.id)}
              onKeyDown={(event) => move(event, index)}
              className={cn(
                'rounded-t-xl px-6 py-3 text-[0.75rem] leading-5 font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue-500 lg:px-8 lg:py-4 lg:text-h6',
                selected ? 'bg-brand-blue-400 text-brand-blue-100' : 'text-dark-300 hover:text-brand-blue-400',
              )}
            >
              {panel.label}
            </button>
          )
        })}
      </div>
      {panels.map((panel) => (
        <div
          key={panel.id}
          role="tabpanel"
          id={`panel-${panel.id}`}
          aria-labelledby={`tab-${panel.id}`}
          hidden={panel.id !== active}
          className={cn(
            'flex flex-col gap-2 rounded-xl border-[0.5px] border-brand-blue-200 bg-light-100 p-2 lg:gap-6 lg:p-6',
            panel.id === panels[0]?.id && 'rounded-tl-none',
          )}
        >
          {panel.content}
        </div>
      ))}
    </section>
  )
}
