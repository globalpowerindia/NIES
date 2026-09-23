'use client'

import Image from 'next/image'

/**
 * The design stacks three offer lines inside a 20px clipped window, i.e. a
 * vertical ticker. Duplicating the first line lets the loop reset invisibly.
 */
export const OffersTicker = ({ offers }: { offers: string[] }) => {
  if (offers.length === 0) return <span />
  const lines = offers.length > 1 ? [...offers, offers[0]] : offers
  return (
  <div className="flex h-5 items-start gap-2 overflow-hidden">
    <Image src="/icons/offer.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
    <ul className={offers.length > 1 ? 'animate-ticker leading-5' : 'leading-5'}>
      {lines.map((offer, index) => (
        <li
          key={`${offer}-${index}`}
          className="h-5 whitespace-nowrap text-body3 text-yellow-400"
        >
          {offer}
        </li>
      ))}
    </ul>
  </div>
  )
}
