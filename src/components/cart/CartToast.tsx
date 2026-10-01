'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useCart, type CartToast as CartToastData } from '@/components/cart/cart-store'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const TOAST_ID = 'cart'

const Card = ({ data, onCart }: { data: CartToastData; onCart: boolean }) => (
  <div
    role={data.kind === 'error' ? 'alert' : 'status'}
    className="flex w-[min(28rem,calc(100vw-2rem))] items-center gap-3 rounded-xl bg-dark-500 px-4 py-3 text-body2 text-light-100 shadow-lg"
  >
    {data.kind === 'error' ? (
      <CircleAlert className="size-5 shrink-0 text-brand-red-200" strokeWidth={1.5} aria-hidden />
    ) : (
      <CircleCheck
        className={cn('size-5 shrink-0', data.kind === 'added' ? 'text-green-400' : 'text-yellow-400')}
        strokeWidth={1.5}
        aria-hidden
      />
    )}
    <p className="flex-1">{data.message}</p>
    {data.kind !== 'error' && !onCart && (
      <Link
        href="/cart"
        onClick={() => toast.dismiss(TOAST_ID)}
        className="shrink-0 font-medium text-brand-blue-200 hover:underline"
      >
        View cart
      </Link>
    )}
    <button
      type="button"
      onClick={() => toast.dismiss(TOAST_ID)}
      aria-label="Dismiss"
      className="shrink-0 opacity-70 hover:opacity-100"
    >
      <X className="size-4" />
    </button>
  </div>
)

/**
 * Confirms an add, or says why it didn't happen, through shadcn's Sonner
 * toaster. Each message replaces the last. Rendered once, in the layout.
 */
export const CartToast = () => {
  const { toast: data } = useCart()
  const pathname = usePathname()

  useEffect(() => {
    if (data) toast.custom(() => <Card data={data} onCart={pathname === '/cart'} />, { id: TOAST_ID })
    // Only a new message shows a toast; moving pages must not replay the last one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Leaving the page takes the message with it.
  useEffect(() => {
    toast.dismiss(TOAST_ID)
  }, [pathname])

  return <Toaster position="bottom-center" duration={4000} offset={24} mobileOffset={16} />
}
