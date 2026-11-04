'use client'

import { useState } from 'react'

export const DEFAULT_SEARCH_HINT = 'Power Tools, Hand Tools...'

/**
 * The search box's placeholder, drawn over the input because a native one can't
 * animate. Each pass of the CSS animation brings one name in and out, so the
 * name changes at the end of a pass, while it can't be seen. With reduced motion
 * no pass ever ends and the default text simply stays.
 *
 * It must directly follow the input: CSS hides it once the input has a value,
 * which also covers text the browser restored without any change event.
 */
export const SearchHint = ({ hints }: { hints: string[] }) => {
  const [hint, setHint] = useState(DEFAULT_SEARCH_HINT)

  const next = () => {
    const others = hints.filter((name) => name !== hint)
    if (others.length > 0) setHint(others[Math.floor(Math.random() * others.length)])
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-body2 text-dark-400 peer-not-placeholder-shown:hidden md:text-body1"
    >
      <span
        onAnimationIteration={next}
        className={hints.length > 0 ? 'animate-search-hint min-w-0 truncate' : 'min-w-0 truncate'}
      >
        {hint}
      </span>
    </div>
  )
}
