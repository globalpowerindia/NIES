'use client'

import Link from 'next/link'
import { useState, type ComponentProps } from 'react'

/**
 * A link for long lists of products. Next prefetches every link that scrolls
 * into view, which on a catalogue page means dozens of server requests for
 * pages the shopper will never open. This waits until they point at it, so the
 * click still feels instant.
 */
export const HoverPrefetchLink = (props: ComponentProps<typeof Link>) => {
  const [wanted, setWanted] = useState(false)
  return (
    <Link
      {...props}
      prefetch={wanted ? null : false}
      onMouseEnter={(event) => {
        setWanted(true)
        props.onMouseEnter?.(event)
      }}
      onFocus={(event) => {
        setWanted(true)
        props.onFocus?.(event)
      }}
    />
  )
}
