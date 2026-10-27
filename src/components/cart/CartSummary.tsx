'use client'

import { useState, type FormEvent } from 'react'

import { applyCoupon, removeCoupon } from '@/components/cart/cart-store'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { CartView } from '@/lib/storefront/cart'

const Divider = () => <hr className="w-full border-t-[0.5px] border-dark-100" />

/** Amounts as the design sets them: always with paise, the rupee sign in bold from sm up. */
const Amount = ({ paise }: { paise: number }) => {
  const text = formatCurrency(paise, { showPaise: true })
  return (
    <>
      <span className="sm:font-bold">{text.slice(0, 1)}</span>
      {text.slice(1)}
    </>
  )
}

// Phones (Figma 1410:31228) set 14px rows with 4px padding; from sm, 20px rows.
const Row = ({
  label,
  paise,
  strong,
  flush,
}: {
  label: string
  paise: number
  strong?: boolean
  /** No vertical padding on phones, as the design's Grand Total row. */
  flush?: boolean
}) => (
  <div
    className={`flex items-center justify-between gap-4 text-label2 font-medium text-dark-500 sm:py-3 sm:text-h6 ${flush ? '' : 'py-1'}`}
  >
    <dt>{label}</dt>
    <dd className={strong ? 'font-semibold' : 'text-body3 font-medium sm:text-h6'}>
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
            text: coupon.freeShipping
              ? `Coupon ${coupon.code} applied. Delivery is free at checkout.`
              : cart.lines.some((line) => line.status === 'OK' && !line.couponEligible)
                ? `Coupon ${coupon.code} applied to eligible items. You save ${formatCurrency(cart.discountPaise)}.`
                : `Coupon ${coupon.code} applied. You save ${formatCurrency(cart.discountPaise)}.`,
          }
        : { tone: 'error', text: `${coupon.message} Coupon ${coupon.code} isn't applied.` }

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <form
        onSubmit={submit}
        noValidate
        className="flex h-[3.3125rem] items-center gap-4 rounded-sm border-[0.5px] border-dark-100 bg-light-500 p-4 sm:h-18"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* The coupon artwork is drawn inside a frame, as in the design: 21px on phones, 28px from sm. */}
          <span aria-hidden className="relative size-[1.3125rem] shrink-0 overflow-clip sm:size-7">
            <span className="absolute inset-[14.29%_3.57%]">
              <span className="absolute inset-[-5%_-3.85%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/coupon.svg" alt="" className="block size-full max-w-none" />
              </span>
            </span>
          </span>
          {coupon ? (
            <p className="truncate text-body2 font-medium text-dark-500 sm:text-body1">
              {coupon.code}
            </p>
          ) : (
            <Input
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
              // Typed text stays 16px on phones so iOS Safari doesn't zoom in; the placeholder is the design's 12px.
              className="min-w-0 flex-1 bg-transparent text-body2 text-dark-500 uppercase outline-none placeholder:text-[0.75rem] placeholder:leading-4 placeholder:text-dark-400 placeholder:normal-case sm:text-body1 sm:placeholder:text-body1"
            />
          )}
        </div>
        <span
          aria-hidden
          className="w-0 self-stretch border-l-[0.5px] border-dark-200 sm:h-11.25 sm:self-auto"
        />
        <button
          type="submit"
          disabled={busy}
          className="text-label1 font-semibold text-brand-blue-300 transition-opacity hover:opacity-80 disabled:opacity-60 sm:text-h6"
        >
          {coupon ? 'Remove' : 'Apply'}
        </button>
      </form>
      <p
        id="coupon-message"
        role={message.tone === 'error' ? 'alert' : 'status'}
        className={
          // Phones use the design's 10px Manrope caption.
          cn(
            'font-mobile-caption text-caption1 sm:font-sans sm:text-body1',
            message.tone === 'error' ? 'text-brand-red-500' : 'text-green-400',
          )
        }
      >
        {message.text}
      </p>
    </div>
  )
}

/** 155 × 40 beside the amount on phones (Figma 1410:31268); full width from sm. */
const checkoutClass = 'h-10 w-[9.6875rem] shrink-0 text-body3 sm:h-12.5 sm:w-full sm:text-body2'

const percent = (bps: number) =>
  `${(bps / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`

/**
 * Order Summary, from Figma node 1100:27930, and on phones node 1410:31228:
 * a grey panel with smaller rows, and the amount payable beside a compact
 * Checkout Now button. Prices are GST-inclusive, so the
 * subtotal is the taxable value and the GST rows add back up to the shelf
 * price; the coupon then comes off to give the amount payable.
 */
export const CartSummary = ({ cart }: { cart: CartView }) => {
  const { breakdown } = cart
  const half = breakdown.rateBps !== null ? ` ${percent(breakdown.rateBps / 2)}` : ''

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 rounded-lg bg-light-400 p-5 sm:gap-4 sm:bg-light-100 lg:sticky lg:top-6 lg:w-127.5">
      <h2 className="text-label1 font-semibold text-dark-500 sm:text-h6">Order Summary</h2>
      <Divider />
      <dl>
        <Row label="Sub Total :" paise={breakdown.taxablePaise} />
        <Row label={`+ CGST${half} :`} paise={breakdown.cgstPaise} />
        <Row label={`+ SGST${half} :`} paise={breakdown.sgstPaise} />
      </dl>
      <Divider />
      <dl>
        <Row label="Grand Total :" paise={cart.subtotalPaise} flush />
      </dl>
      <CouponBox cart={cart} />
      <Divider />
      <div className="flex items-start gap-2 sm:flex-col sm:items-stretch sm:gap-4">
        <dl className="min-w-0 flex-1">
          <div className="flex flex-col sm:hidden">
            <dt className="text-label3 font-medium text-dark-500">Amount Payable :</dt>
            <dd className="py-1 text-label2 font-semibold text-dark-500">
              <Amount paise={cart.totalPaise} />
            </dd>
          </div>
          <div className="hidden sm:block">
            <Row label="Amount Payable :" paise={cart.totalPaise} strong />
          </div>
        </dl>
        {cart.canCheckout ? (
          <ButtonLink href="/checkout" variant="blue" className={checkoutClass}>
            Checkout Now
          </ButtonLink>
        ) : (
          <Button variant="blue" className={checkoutClass} disabled>
            Checkout Now
          </Button>
        )}
      </div>
      {!cart.canCheckout && (
        <p role="status" className="-mt-2 text-body3 text-brand-red-500 sm:text-body2">
          Fix the items marked in red to continue.
        </p>
      )}
      <p className="flex items-center justify-center gap-2 py-0.5 text-[0.75rem] leading-4 text-dark-300 sm:justify-start sm:text-body2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/verified-24.svg"
          alt=""
          width={24}
          height={24}
          className="size-4 sm:size-6"
        />
        100% Safe and secure payments
      </p>
    </aside>
  )
}
