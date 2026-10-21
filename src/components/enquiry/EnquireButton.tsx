'use client'

import Image from 'next/image'
import { createContext, useContext, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Products that aren't sold online are enquired about on WhatsApp. The number
 * comes from Header & Footer → WhatsApp number, given once by the layout. A
 * darker green than the floating button: white text on #25d366 is unreadable.
 */
const WhatsAppNumber = createContext<string | null>(null)

export const EnquiryProvider = ({ whatsapp, children }: { whatsapp: string | null; children: ReactNode }) => (
  <WhatsAppNumber.Provider value={whatsapp}>{children}</WhatsAppNumber.Provider>
)

type Props = {
  productName: string
  /** The product page path, so staff can see exactly what was asked about. */
  href: string
  className?: string
  /** Icon only, for tight card layouts. */
  compact?: boolean
}

export const EnquireButton = ({ productName, href, className, compact = false }: Props) => {
  const whatsapp = useContext(WhatsAppNumber)
  if (!whatsapp) return null

  const open = () => {
    const url = new URL(href, window.location.origin).toString()
    const text = `Hi, I'd like to know the price and availability of ${productName}.\n${url}`
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label={compact ? `Enquire about ${productName} on WhatsApp` : undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#117a43] font-medium whitespace-nowrap text-light-100 transition-colors outline-none hover:bg-[#0d6236] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#117a43]',
        compact ? 'size-10' : 'h-10 px-4',
        className,
      )}
    >
      <Image src="/icons/social-whatsapp.svg" alt="" width={20} height={20} className="size-5 shrink-0 brightness-0 invert" />
      {!compact && 'Enquire on WhatsApp'}
    </button>
  )
}
