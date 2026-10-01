'use client'

import { useState, type FormEvent } from 'react'

import { applyCoupon, removeCoupon } from '@/components/cart/cart-store'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/money'
import type { CartView } from '@/lib/storefront/cart'

const Divider = () => <hr className="w-full border-t-[0.5px] border-dark-100" />

/** Amounts as the design sets them: always with paise, the rupee sign in bold. */
const Amount = ({ paise }: { paise: number }) => {
  const text = formatCurrency(paise, { showPaise: true })
  return (
    <>
      <span className="font-bold">{text.slice(0, 1)}</span>
      {text.slice(1)}
    </>
  )
}

const Row = ({ label, paise, strong }: { label: string; paise: number; strong?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-3 text-h6 font-medium text-dark-500">
    <dt>{label}</dt>
    <dd className={strong ? 'font-semibold' : undefined}>
      <Amount paise={paise} />
    </dd>
  </div>
)

/** "Have a coupon code?" from Figma node 1100:28009, and the line under it. */
const CouponBox = ({ cart }: { cart: CartView }) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const coupon = cart.coupon

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    if (coupon) {
      await removeCoupon()
      setError(null)
    } else {
      if (!code.trim()) {
        setError('Enter a code.')
        return setBusy(false)
      }
      const result = await applyCoupon(code)
      setError(result.ok ? null : result.error!)
      if (result.ok) setCode('')
    }
    setBusy(false)
  }

  const message = error
    ? { tone: 'error', text: error }
    : !coupon
      ? { tone: 'ok', text: 'No coupon applied' }
      : coupon.applied
        ? {
            tone: 'ok',
            text: `Coupon ${coupon.code} applied. You save ${formatCurrency(cart.discountPaise)}.`,
          }
        : { tone: 'error', text: `${coupon.message} Coupon ${coupon.code} isn't applied.` }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        noValidate
        className="flex h-18 items-center gap-4 rounded-sm border-[0.5px] border-dark-100 bg-light-500 p-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* The coupon artwork is drawn inside a 28px frame, as in the design. */}
          <span aria-hidden className="relative size-7 shrink-0 overflow-clip">
            <span className="absolute inset-[14.29%_3.57%]">
              <span className="absolute inset-[-5%_-3.85%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/coupon.svg" alt="" className="block size-full max-w-none" />
              </span>
            </span>
          </span>
          {coupon ? (
            <p className="truncate text-body1 font-medium text-dark-500">{coupon.code}</p>
          ) : (
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setError(null)
              }}
              aria-label="Coupon code"
              aria-invalid={Boolean(error)}
              aria-describedby="coupon-message"
              placeholder="Have a coupon code?"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-body1 text-dark-500 uppercase outline-none placeholder:text-dark-400 placeholder:normal-case"
            />
          )}
        </div>
        <span aria-hidden className="h-11.25 w-0 border-l-[0.5px] border-dark-200" />
        <button
          type="submit"
          disabled={busy}
          className="text-h6 font-semibold text-brand-blue-300 transition-opacity hover:opacity-80 disabled:opacity-60"
        >
          {coupon ? 'Remove' : 'Apply'}
        </button>
      </form>
      <p
        id="coupon-message"
        role={message.tone === 'error' ? 'alert' : 'status'}
        className={
          message.tone === 'error' ? 'text-body1 text-brand-red-500' : 'text-body1 text-green-400'
        }
      >
        {message.text}
      </p>
    </div>
  )
}

const percent = (bps: number) =>
  `${(bps / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`

/**
 * Order Summary, from Figma node 1100:27930. Prices are GST-inclusive, so the
 * subtotal is the taxable value and the GST rows add back up to the shelf
 * price; the coupon then comes off to give the amount payable.
 */
export const CartSummary = ({ cart }: { cart: CartView }) => {
  const { breakdown } = cart
  const half = breakdown.rateBps !== null ? ` ${percent(breakdown.rateBps / 2)}` : ''

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 rounded-lg bg-light-100 p-5 lg:sticky lg:top-6 lg:w-127.5">
      <h2 className="text-h6 font-semibold text-dark-500">Order Summary</h2>
      <Divider />
      <dl>
        <Row label="Sub Total :" paise={breakdown.taxablePaise} />
        <Row label={`+ CGST${half} :`} paise={breakdown.cgstPaise} />
        <Row label={`+ SGST${half} :`} paise={breakdown.sgstPaise} />
      </dl>
      <Divider />
      <dl>
        <Row label="Grand Total :" paise={cart.subtotalPaise} />
      </dl>
      <CouponBox cart={cart} />
      <Divider />
      <dl>
        <Row label="Amount Payable :" paise={cart.totalPaise} strong />
      </dl>
      {/* Checkout arrives with Module 7; the button sits in its final place until then. */}
      <Button
        variant="blue"
        className="h-12.5 w-full"
        disabled
        title={cart.canCheckout ? 'Online checkout opens soon.' : undefined}
      >
        Checkout Now
      </Button>
      {!cart.canCheckout && (
        <p role="status" className="-mt-2 text-body2 text-brand-red-500">
          Fix the items marked in red to continue.
        </p>
      )}
      <p className="flex items-center gap-2 py-0.5 text-body2 text-dark-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/verified-24.svg" alt="" width={24} height={24} className="size-6" />
        100% Safe and secure payments
      </p>
    </aside>
  )
}
