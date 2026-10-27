'use client'

import { Building2, House, MapPin, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { AddressType } from '@/collections/Addresses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/money'

export type CheckoutAddress = { id: number; fullName: string; phone: string; type: AddressType; lines: string[] }

export type CheckoutQuoteView = {
  weightGrams: number
  /** Delivery a free-delivery coupon waived. */
  deliveryDiscountPaise: number
  subtotalPaise: number
  discountPaise: number
  shippingPaise: number
  taxablePaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  grandTotalPaise: number
}

export type CheckoutLine = {
  variantId: number
  name: string
  variantName: string | null
  imageUrl: string
  imageAlt: string
  quantity: number
  unitPricePaise: number
}

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
type RazorpayInstance = { open: () => void; on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void }
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const TYPE_ICON: Record<AddressType, typeof House> = { HOME: House, OFFICE: Building2, OTHER: MapPin }

const money = (paise: number) => formatCurrency(paise, { showPaise: true })

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex items-center justify-between gap-4 py-2 ${strong ? 'text-body1 font-semibold sm:text-h6' : 'text-body3 sm:text-body1'} text-dark-500`}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
)

const weightText = (grams: number) =>
  `${(grams / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`

/**
 * Checkout: pick an address, confirm the receipt email, pay through
 * Razorpay's own window. The server prices the order again when it's placed;
 * the total shown here is sent along so a price change is caught, not charged.
 */
export const CheckoutForm = ({
  lines,
  couponCode,
  addresses,
  quotes,
  email: initialEmail,
  paymentReady,
}: {
  lines: CheckoutLine[]
  couponCode: string | null
  addresses: CheckoutAddress[]
  quotes: Record<number, CheckoutQuoteView>
  email: string
  paymentReady: boolean
}) => {
  const router = useRouter()
  const [addressId, setAddressId] = useState<number | null>(addresses[0]?.id ?? null)
  const [email, setEmail] = useState(initialEmail)
  const [gstin, setGstin] = useState('')
  const [showGstin, setShowGstin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const quote = addressId ? quotes[addressId] : null
  const gstPaise = quote ? quote.cgstPaise + quote.sgstPaise + quote.igstPaise : 0
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)

  const verify = async (response: RazorpayResponse) => {
    const reply = await fetch('/api/checkout/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      }),
    }).catch(() => null)
    const body = (await reply?.json().catch(() => null)) as { ok?: boolean; orderNumber?: string; error?: string } | null
    if (body?.ok && body.orderNumber) {
      router.push(`/checkout/complete/${encodeURIComponent(body.orderNumber)}`)
      return
    }
    // The webhook confirms the payment independently; the order page shows it once it lands.
    setBusy(false)
    setError(body?.error ?? 'Your payment went through, but we couldn’t confirm it here. Check My Orders in a minute.')
  }

  const pay = async () => {
    if (!addressId || !quote) return setError('Choose a delivery address.')
    setBusy(true)
    setError(null)
    setFieldErrors({})

    const reply = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressId, email, gstin: showGstin ? gstin : null, expectedTotalPaise: quote.grandTotalPaise }),
    }).catch(() => null)
    const body = (await reply?.json().catch(() => null)) as {
      ok?: boolean
      error?: string
      code?: string
      fields?: Record<string, string>
      orderNumber?: string
      razorpay?: { keyId: string; orderId: string; amountPaise: number; currency: string; expiresAt: string }
    } | null

    if (!body?.ok || !body.razorpay || !body.orderNumber) {
      setBusy(false)
      setFieldErrors(body?.fields ?? {})
      setError(body?.error ?? 'Something went wrong. Please try again.')
      if (body?.code === 'TOTAL_CHANGED') router.refresh()
      return
    }

    if (!(await loadRazorpay()) || !window.Razorpay) {
      setBusy(false)
      return setError('The payment window couldn’t load. Check your connection, or turn off any ad blocker, and try again.')
    }

    const address = addresses.find((candidate) => candidate.id === addressId)!
    const secondsLeft = Math.floor((new Date(body.razorpay.expiresAt).getTime() - Date.now()) / 1000)
    const checkout = new window.Razorpay({
      key: body.razorpay.keyId,
      order_id: body.razorpay.orderId,
      amount: body.razorpay.amountPaise,
      currency: body.razorpay.currency,
      name: 'Tools Hypermarket',
      description: `Order ${body.orderNumber}`,
      prefill: { name: address.fullName, email, contact: address.phone.replace(/\s/g, '') },
      notes: { orderNumber: body.orderNumber },
      theme: { color: '#293681' },
      // Razorpay closes the window before our hold on the stock runs out.
      timeout: Math.max(60, secondsLeft - 60),
      handler: verify,
      modal: {
        ondismiss: () => {
          setBusy(false)
          setError('Payment cancelled. Your items are held for a few minutes if you want to try again.')
        },
      },
    })
    checkout.on('payment.failed', (response) => {
      setError(`${response.error?.description ?? 'The payment failed.'} You can try again or use another method.`)
    })
    checkout.open()
  }

  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
        <section aria-labelledby="address-heading" className="flex flex-col gap-4 rounded-lg bg-light-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <h1 id="address-heading" className="text-body1 font-semibold text-dark-500 sm:text-h6">
              Delivery Address
            </h1>
            <Link
              href="/account/addresses/new?next=/checkout"
              className="flex shrink-0 items-center gap-1 text-body3 font-medium whitespace-nowrap text-brand-blue-300 hover:opacity-80 sm:text-body1"
            >
              <Plus className="size-4" aria-hidden /> Add new address
            </Link>
          </div>
          <hr className="w-full border-t-[0.5px] border-dark-100" />
          {addresses.length === 0 ? (
            <p className="text-body3 text-dark-300 sm:text-label1">
              Add a delivery address to continue.{' '}
              <Link href="/account/addresses/new?next=/checkout" className="font-medium text-brand-blue-300 hover:underline">
                Add address
              </Link>
            </p>
          ) : (
            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="sr-only">Choose a delivery address</legend>
              {addresses.map((address) => {
                const Icon = TYPE_ICON[address.type]
                const selected = address.id === addressId
                return (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
                      selected ? 'border-brand-blue-500 bg-brand-blue-100' : 'border-dark-100 hover:border-brand-blue-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selected}
                      onChange={() => setAddressId(address.id)}
                      className="mt-1 size-4 accent-brand-blue-500"
                    />
                    <span className="flex min-w-0 flex-col gap-1 text-body3 text-dark-400 sm:text-body2">
                      <span className="flex items-center gap-2 text-body2 font-semibold text-dark-500 sm:text-body1">
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {address.fullName}
                      </span>
                      {address.lines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                      <span>{address.phone}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}
        </section>

        <section aria-labelledby="contact-heading" className="flex flex-col gap-4 rounded-lg bg-light-100 p-5">
          <h2 id="contact-heading" className="text-body1 font-semibold text-dark-500 sm:text-h6">
            Order Updates
          </h2>
          <hr className="w-full border-t-[0.5px] border-dark-100" />
          <label className="flex flex-col gap-2 text-body3 text-dark-500 sm:text-body1">
            Email for your receipt
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              className="h-12 rounded-sm border-[0.5px] border-dark-100 bg-light-100 px-4 text-body2 sm:text-body1"
            />
            {fieldErrors.email && <span className="text-body3 text-brand-red-500 sm:text-body2">{fieldErrors.email}</span>}
          </label>
          {showGstin ? (
            <label className="flex flex-col gap-2 text-body3 text-dark-500 sm:text-body1">
              GSTIN for a business invoice (optional)
              <Input
                value={gstin}
                onChange={(event) => setGstin(event.target.value.toUpperCase())}
                maxLength={15}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(fieldErrors.gstin)}
                className="h-12 rounded-sm border-[0.5px] border-dark-100 bg-light-100 px-4 text-body2 uppercase sm:text-body1"
              />
              {fieldErrors.gstin && <span className="text-body3 text-brand-red-500 sm:text-body2">{fieldErrors.gstin}</span>}
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setShowGstin(true)}
              className="self-start text-body3 font-medium text-brand-blue-300 hover:opacity-80 sm:text-body1"
            >
              + Add GSTIN for a business invoice
            </button>
          )}
        </section>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 rounded-lg bg-light-100 p-5 lg:sticky lg:top-6 lg:w-127.5">
        <h2 className="text-body1 font-semibold text-dark-500 sm:text-h6">
          Order Summary <span className="text-body3 font-normal text-dark-300 sm:text-label1">({count} item{count === 1 ? '' : 's'})</span>
        </h2>
        <hr className="w-full border-t-[0.5px] border-dark-100" />
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.variantId} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail, already optimised in the cart */}
              <img src={line.imageUrl} alt={line.imageAlt} className="size-14 shrink-0 rounded-sm bg-light-400 object-contain" />
              <span className="flex min-w-0 flex-1 flex-col text-body3 text-dark-500 sm:text-body2">
                <span className="truncate">{line.name}</span>
                <span className="text-dark-300">
                  {line.variantName ? `${line.variantName} · ` : ''}Qty {line.quantity}
                </span>
              </span>
              <span className="text-body3 font-medium text-dark-500 sm:text-body2">{money(line.unitPricePaise * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <hr className="w-full border-t-[0.5px] border-dark-100" />
        {quote ? (
          <dl>
            <Row label="Items" value={money(quote.subtotalPaise)} />
            {quote.discountPaise > 0 && <Row label={`Coupon${couponCode ? ` ${couponCode}` : ''}`} value={`− ${money(quote.discountPaise)}`} />}
            <Row
              label={`Delivery (${weightText(quote.weightGrams)})`}
              value={
                quote.deliveryDiscountPaise
                  ? `Free with ${couponCode ?? 'coupon'}`
                  : quote.shippingPaise
                    ? money(quote.shippingPaise)
                    : 'Free'
              }
            />
            {quote.deliveryDiscountPaise > 0 && (
              <p className="-mt-1 text-right text-body3 text-dark-300 line-through">{money(quote.deliveryDiscountPaise)}</p>
            )}
            <hr className="my-2 w-full border-t-[0.5px] border-dark-100" />
            <Row label="Amount Payable" value={money(quote.grandTotalPaise)} strong />
            <p className="text-body3 text-dark-300">
              Includes {money(gstPaise)} GST
              {quote.igstPaise ? ' (IGST)' : ` (CGST ${money(quote.cgstPaise)} + SGST ${money(quote.sgstPaise)})`}
            </p>
          </dl>
        ) : (
          <p className="text-body3 text-dark-300 sm:text-body1">Choose a delivery address to see delivery charges and your total.</p>
        )}
        {error && (
          <p role="alert" className="text-body3 text-brand-red-500 sm:text-body2">
            {error}
          </p>
        )}
        <Button
          variant="blue"
          className="h-12.5 w-full"
          disabled={!quote || busy || !paymentReady}
          onClick={pay}
        >
          {busy ? 'Opening payment…' : quote ? `Pay ${money(quote.grandTotalPaise)}` : 'Pay'}
        </Button>
        {!paymentReady && (
          <p role="status" className="-mt-2 text-body2 text-brand-red-500">
            Online payment isn’t switched on yet.
          </p>
        )}
        <p className="flex items-center gap-2 py-0.5 text-body2 text-dark-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/verified-24.svg" alt="" width={24} height={24} className="size-6" />
          Secure payment by Razorpay · UPI, cards, netbanking, wallets
        </p>
      </aside>
    </div>
  )
}
