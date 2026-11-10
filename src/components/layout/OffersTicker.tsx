'use client'

import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/** An offer line from Header & Footer → Offer lines, with its link already resolved. */
export type OfferLine = {
  text: string
  tag?: string | null
  href?: string | null
  linkLabel?: string | null
  /** ISO time. Shows a countdown, and the line hides once it passes. */
  endsAt?: string | null
}

const ROTATE_MS = 5000

const pad = (value: number) => String(value).padStart(2, '0')

/** "2d 14h 05m" while days are left, then "04:12:09". */
const timeLeft = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return days > 0 ? `${days}d ${hours}h ${pad(minutes)}m` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * The offers in the bar at the very top: one at a time, sliding in every few
 * seconds and pausing while pointed at. Each can carry a highlighted tag, a
 * link with a call to action, and a countdown to its end time.
 */
export const OffersTicker = ({ offers }: { offers: OfferLine[] }) => {
  // The clock starts after hydration, so the server and browser render the same text.
  const [now, setNow] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const ticking = offers.some((offer) => offer.endsAt)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the clock is only possible here
    setNow(Date.now())
    if (!ticking) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [ticking])

  const live = offers.filter((offer) => !offer.endsAt || now === null || Date.parse(offer.endsAt) > now)

  useEffect(() => {
    if (live.length < 2 || paused) return
    const timer = window.setTimeout(() => setIndex((value) => value + 1), ROTATE_MS)
    return () => window.clearTimeout(timer)
  }, [index, live.length, paused])

  if (live.length === 0) return <span />
  const offer = live[index % live.length]
  const ends = offer.endsAt && now !== null ? Date.parse(offer.endsAt) - now : null

  const body = (
    <>
      {offer.tag && (
        <span className="shrink-0 rounded-full bg-brand-red-500 px-2 py-0.5 text-[0.625rem] leading-4 font-bold tracking-wide text-light-100 uppercase shadow-sm md:text-[0.6875rem]">
          {offer.tag}
        </span>
      )}
      <span className="min-w-0 truncate text-body2 font-semibold tracking-wide text-light-100 md:text-body1">{offer.text}</span>
      {ends !== null && ends > 0 && (
        <span className="shrink-0 rounded-md bg-light-100/10 px-1.5 py-0.5 text-[0.6875rem] leading-4 font-semibold text-light-100 tabular-nums md:text-label2 ring-1 ring-light-100/20">
          <span className="max-sm:hidden">Ends in </span>
          {timeLeft(ends)}
        </span>
      )}
      {offer.href && (
        <span className="ml-1 flex shrink-0 items-center gap-1 rounded-md bg-light-100 px-2 py-1 text-body3 font-bold text-brand-blue-600 shadow-sm transition-colors group-hover:bg-brand-blue-100 sm:px-4">
          <span className="max-sm:hidden">{offer.linkLabel || 'Shop now'}</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      )}
    </>
  )

  return (
    <div
      className="flex h-9 min-w-0 flex-1 items-center gap-2 md:justify-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Image src="/icons/offer.svg" alt="" width={20} height={20} className="size-5 shrink-0 animate-pulse brightness-0 invert" />
      {/* Remounted per offer, so each one slides in. */}
      <div key={`${index}-${offer.text}`} className="flex min-w-0 animate-offer-in items-center gap-2">
        {offer.href ? (
          <Link href={offer.href} className="group flex min-w-0 items-center gap-2">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </div>
  )
}
