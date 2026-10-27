'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The phone screens' header: the design's back arrow, then the page title in
 * Body-1 Medium (Figma 1408:30673, 1412:32197). Back returns to the previous
 * page when it was on this site, otherwise to `fallback`.
 */
export const PhoneBackTitle = ({
  fallback,
  className,
  arrowClassName,
  titleClassName,
  children,
}: {
  fallback: string
  className?: string
  /** E.g. `sm:hidden`, when the same title carries on above phone width without the arrow. */
  arrowClassName?: string
  titleClassName?: string
  children: ReactNode
}) => {
  const router = useRouter()

  const goBack = () => {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin)
      router.back()
    else router.push(fallback)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className={cn(
          '-m-1 p-1 focus-visible:outline-2 focus-visible:outline-brand-blue-500',
          arrowClassName,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a 24px SVG icon. */}
        <img src="/icons/arrow-left.svg" alt="" width={24} height={24} className="size-6" />
      </button>
      <h1 className={cn('text-[1.125rem] leading-7 font-medium text-dark-500', titleClassName)}>
        {children}
      </h1>
    </div>
  )
}
