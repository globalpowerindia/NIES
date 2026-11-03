'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  } catch {
    toast.error("Couldn't copy the link. Please copy it from the address bar.")
  }
}

/**
 * Opens the device's own share sheet (WhatsApp and the rest), or copies the
 * link where there isn't one, as on most desktop browsers. The link keeps the
 * chosen variant, so whoever opens it sees the same option. The photo reaches
 * the other person through the link's preview, built from the page's metadata.
 */
export const ShareButton = ({
  name,
  description,
  className,
  iconClassName,
  strokeWidth = 1.5,
}: {
  name: string
  description: string
  className?: string
  iconClassName?: string
  strokeWidth?: number
}) => (
  <button
    type="button"
    aria-label={`Share ${name}`}
    onClick={async () => {
      const url = window.location.href.split('#')[0]
      if (!navigator.share) return copyLink(url)
      try {
        // The name goes in the text as well: WhatsApp and others ignore the title.
        await navigator.share({ title: name, text: `${name}\n${description}`, url })
      } catch (error) {
        // Closing the share sheet counts as an error, but the shopper just changed their mind.
        if (error instanceof DOMException && error.name === 'AbortError') return
        await copyLink(url)
      }
    }}
    className={cn('text-dark-500 transition-colors hover:text-brand-blue-400', className)}
  >
    <Share2 className={iconClassName} strokeWidth={strokeWidth} aria-hidden />
  </button>
)
