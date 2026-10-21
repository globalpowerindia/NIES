'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export const ProductMobileBack = ({ fallback }: { fallback: string }) => {
  const router = useRouter()
  return (
    <div className="flex h-[3.25rem] items-center lg:hidden">
      <button
        type="button"
        onClick={() => {
          if (document.referrer && new URL(document.referrer).origin === window.location.origin)
            router.back()
          else router.push(fallback)
        }}
        className="flex items-center gap-2 py-2 text-body2 text-dark-500 focus-visible:outline-2 focus-visible:outline-brand-blue-500"
      >
        <ChevronLeft className="size-6" strokeWidth={1.5} aria-hidden /> Back
      </button>
    </div>
  )
}
