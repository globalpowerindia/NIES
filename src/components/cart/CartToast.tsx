'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { dismissCartToast, useCart } from '@/components/cart/cart-store'
import { cn } from '@/lib/utils'

const VISIBLE_MS = 4000

/** Confirms an add, or says why it didn't happen. Rendered once, in the layout. */
export const CartToast = () => {
  const { toast } = useCart()
  const pathname = usePathname()

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissCartToast, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Leaving the page takes the message with it.
  useEffect(() => dismissCartToast(), [pathname])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center"
    >
      {toast && (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-dark-500 px-4 py-3 text-body2 text-light-100 shadow-lg"
        >
          {toast.kind === 'error' ? (
            <CircleAlert
              className="size-5 shrink-0 text-brand-red-200"
              strokeWidth={1.5}
              aria-hidden
            />
          ) : (
            <CircleCheck
              className={cn(
                'size-5 shrink-0',
                toast.kind === 'added' ? 'text-green-400' : 'text-yellow-400',
              )}
              strokeWidth={1.5}
              aria-hidden
            />
          )}
          <p className="flex-1">{toast.message}</p>
          {toast.kind !== 'error' && pathname !== '/cart' && (
            <Link href="/cart" className="shrink-0 font-medium text-brand-blue-200 hover:underline">
              View cart
            </Link>
          )}
          <button
            type="button"
            onClick={dismissCartToast}
            aria-label="Dismiss"
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
