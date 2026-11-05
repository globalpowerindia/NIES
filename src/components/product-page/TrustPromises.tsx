'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import styles from './product-detail.module.css'

export type TrustPromise = { key: string; icon: ReactNode; label: string; detail: ReactNode }

/** The shop's promises as tabs: point at or tap one to read what it actually means. */
export const TrustPromises = ({ promises }: { promises: TrustPromise[] }) => {
  const [selected, setSelected] = useState(promises[0]?.key)
  const current = promises.find((promise) => promise.key === selected)

  return (
    <div className="flex flex-col gap-3 border-t-[0.5px] border-dark-100 p-3 lg:p-4">
      <ul className="grid grid-cols-2 gap-1.5">
        {promises.map((promise) => (
          <li key={promise.key} className="last:odd:col-span-2">
            <button
              type="button"
              aria-pressed={promise.key === selected}
              onClick={() => setSelected(promise.key)}
              onMouseEnter={() => setSelected(promise.key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-label3 font-semibold transition-colors lg:text-body1',
                promise.key === selected
                  ? 'bg-light-500 text-dark-500'
                  : 'text-dark-400 hover:bg-light-300',
              )}
            >
              {promise.icon}
              {promise.label}
            </button>
          </li>
        ))}
      </ul>
      <p
        key={selected}
        aria-live="polite"
        className={`${styles.fade} min-h-10 px-2 text-label3 text-dark-400 lg:min-h-12 lg:text-body1 [&_a]:font-semibold [&_a]:text-brand-red-500 [&_a]:underline`}
      >
        {current?.detail}
      </p>
    </div>
  )
}
