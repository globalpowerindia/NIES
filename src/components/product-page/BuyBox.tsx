'use client'

import { ChevronDown, Minus, Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { MAX_LINE_QTY as MAX_QTY } from '@/lib/cart-rules'
import { INDIAN_STATES, stateName } from '@/lib/indian-states'
import { formatCurrency, SELLER_STATE_CODE } from '@/lib/money'
import { parcelWeightGrams, shippingFeePaise, type ShippingRates } from '@/lib/shipping'

import styles from './product-detail.module.css'

const stepper =
  'grid size-9 place-items-center rounded-full border-[0.5px] border-dark-100 bg-light-500 text-dark-500 transition-colors hover:bg-neutral-300 disabled:opacity-40'

const OTHER_STATE = INDIAN_STATES.find((state) => state.code !== SELLER_STATE_CODE)!.code

/**
 * Quantity, the purchase buttons and the delivery charge, in the rail that stays
 * beside the page. The charge uses the same slabs and weights as checkout. On
 * phones the buttons sit in a bar fixed to the bottom of the screen.
 */
export const BuyBox = ({
  name,
  variantId,
  inStock,
  sellOnline,
  href,
  pricePaise,
  mrpPaise,
  weightGrams,
  rates,
  price,
  tollFreeNumber,
  imageUrl,
}: {
  name: string
  variantId: number
  inStock: boolean
  sellOnline: boolean
  href: string
  pricePaise: number
  mrpPaise: number
  weightGrams: number | null | undefined
  rates: ShippingRates
  /** The price block, shown here only where the rail is beside the page. */
  price: ReactNode
  tollFreeNumber?: string | null
  /** For the bar that takes over once the buttons scroll out of view. */
  imageUrl: string
}) => {
  const [qty, setQty] = useState(1)
  const [state, setState] = useState('')
  const buttons = useRef<HTMLDivElement>(null)
  const [buttonsGone, setButtonsGone] = useState(false)
  const canBuy = sellOnline && inStock

  useEffect(() => {
    const element = buttons.current
    if (!element || !canBuy) return
    const observer = new IntersectionObserver(([entry]) => setButtonsGone(!entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [canBuy])

  if (!sellOnline) {
    return (
      <section aria-label="Enquire" className="flex flex-col gap-3 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100 p-5">
        {price}
        <div className="fixed inset-x-0 bottom-0 z-50 bg-light-400 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_#0000000a] lg:static lg:bg-transparent lg:p-0 lg:shadow-none">
          <EnquireButton
            productName={name}
            href={href}
            className="mx-auto h-10 w-full max-w-[43.75rem] text-body3 lg:h-12 lg:max-w-none lg:text-body1"
          />
        </div>
        {tollFreeNumber && (
          <a
            href={`tel:${tollFreeNumber.replace(/\s/g, '')}`}
            className="flex h-10 items-center justify-center rounded-xl border-[0.5px] border-dark-200 text-body3 font-medium text-dark-500 transition-colors hover:bg-light-500 lg:h-12 lg:text-body1"
          >
            Call {tollFreeNumber}
          </a>
        )}
        <p className="text-body3 text-dark-400 lg:text-body1">Message us for the price, availability and delivery.</p>
      </section>
    )
  }

  const weight = parcelWeightGrams([{ weightGrams, quantity: qty }], rates.defaultWeightGrams)
  const fee = (code: string) => formatCurrency(shippingFeePaise(rates, weight, code))

  return (
    <>
      <section aria-label="Buy" className="flex flex-col gap-4 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100 p-5">
        {price}
        <div className="flex items-center justify-between gap-4">
          <span className="text-body2 font-medium text-dark-500 lg:text-h6">Quantity</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepper}
              onClick={() => setQty((value) => Math.max(1, value - 1))}
              disabled={!inStock || qty <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" strokeWidth={1.5} />
            </button>
            <output aria-live="polite" aria-label="Quantity" className="w-8 text-center text-body1 font-medium lg:text-h6 text-dark-500">
              {qty}
            </output>
            <button
              type="button"
              className={stepper}
              onClick={() => setQty((value) => Math.min(MAX_QTY, value + 1))}
              disabled={!inStock || qty >= MAX_QTY}
              aria-label="Increase quantity"
            >
              <Plus className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {qty > 1 && (
          <dl className="flex flex-col gap-1 rounded-lg bg-green-100 px-3 py-2 text-body3 text-dark-400 lg:text-body1">
            <div className="flex justify-between">
              <dt>Total for {qty}</dt>
              <dd className="font-semibold text-dark-500">{formatCurrency(pricePaise * qty)}</dd>
            </div>
            {mrpPaise > pricePaise && (
              <div className="flex justify-between">
                <dt>You save</dt>
                <dd className="font-semibold text-green-400">{formatCurrency((mrpPaise - pricePaise) * qty)}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="fixed inset-x-0 bottom-0 z-50 bg-light-400 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_#0000000a] lg:static lg:bg-transparent lg:p-0 lg:shadow-none">
          {inStock ? (
            <div ref={buttons} className="mx-auto flex w-full max-w-[43.75rem] gap-2 lg:max-w-none lg:flex-col">
              <AddToCartButton
                variantId={variantId}
                quantity={qty}
                size="tall"
                className={`${styles.shine} h-10 min-w-0 flex-1 bg-brand-red-500 px-3 text-body3 hover:bg-brand-red-400 lg:h-12 lg:flex-none lg:text-body1`}
                aria-label={`Add ${qty} × ${name} to cart`}
              >
                Add to Cart
              </AddToCartButton>
              <AddToCartButton
                variantId={variantId}
                quantity={qty}
                buyNow
                variant="blue"
                size="tall"
                className={`${styles.shine} h-10 min-w-0 flex-1 px-3 text-body3 lg:h-12 lg:flex-none lg:text-body1`}
                aria-label={`Buy ${qty} × ${name} now`}
              >
                Buy Now
              </AddToCartButton>
            </div>
          ) : (
            <p className="flex h-12 items-center justify-center rounded-xl bg-brand-red-100 text-body2 font-medium text-brand-red-500">
              Out Of Stock
            </p>
          )}
        </div>
      </section>

      {/*
        Phones keep their own fixed buttons, so this is for laptop widths and up. On the
        body, as the sticky rail is its own stacking context and the page would paint over it.
      */}
      {canBuy &&
        buttonsGone &&
        createPortal(
          <div
            role="region"
            aria-label="Quick add to cart"
            className={`${styles.stickyBar} fixed inset-x-0 bottom-0 z-40 hidden bg-light-100 shadow-[0_-3px_10px_#00000033] lg:block`}
          >
            <div className="container-page flex items-center justify-between gap-6 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-light-300">
                  <Image src={imageUrl} alt="" fill sizes="112px" className="object-contain p-1" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-body1 font-medium text-dark-500">{name}</p>
                  <p className="flex items-baseline gap-2 text-body1">
                    {mrpPaise > pricePaise && (
                      <span className="text-body2 text-dark-300 line-through">
                        {formatCurrency(mrpPaise * qty)}
                      </span>
                    )}
                    <span className="font-semibold text-dark-500">{formatCurrency(pricePaise * qty)}</span>
                    {qty > 1 && <span className="text-body2 text-dark-400">for {qty}</span>}
                  </p>
                </div>
              </div>
              <AddToCartButton
                variantId={variantId}
                quantity={qty}
                size="tall"
                className={`${styles.shine} h-12 shrink-0 bg-brand-red-500 px-12 text-body1 hover:bg-brand-red-400`}
                aria-label={`Add ${qty} × ${name} to cart`}
              >
                Add to Cart
              </AddToCartButton>
            </div>
          </div>,
          document.body,
        )}

      <section aria-labelledby="delivery-heading" className="flex flex-col gap-3 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100 p-5">
        <h3 id="delivery-heading" className="flex items-center gap-2 text-body2 font-semibold text-dark-500 lg:text-h6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/shipping.svg" alt="" width={40} height={40} className="size-10 lg:size-12" />
          Delivery charge
        </h3>
        <label className="flex flex-col gap-1 text-body3 text-dark-400 lg:text-body1">
          Deliver to
          <span className="relative block">
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="h-10 w-full cursor-pointer appearance-none rounded-lg border-[0.5px] border-dark-200 bg-light-100 pr-9 pl-3 text-body3 text-dark-500 lg:text-body1"
            >
              <option value="">Choose your state</option>
              {INDIAN_STATES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-dark-400" aria-hidden />
          </span>
        </label>
        {state ? (
          <p className="flex justify-between gap-3 text-body3 text-dark-500 lg:text-body1">
            <span>{stateName(state)}</span>
            <span className="font-semibold">{fee(state)}</span>
          </p>
        ) : (
          <dl className="flex flex-col gap-1 text-body3 text-dark-500 lg:text-body1">
            <div className="flex justify-between gap-3">
              <dt>Within Kerala</dt>
              <dd className="font-semibold">{fee(SELLER_STATE_CODE)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Other states</dt>
              <dd className="font-semibold">{fee(OTHER_STATE)}</dd>
            </div>
          </dl>
        )}
        <p className="text-label3 text-dark-400 lg:text-body1">
          For this item alone, GST included. Checkout confirms the charge for your whole order.{' '}
          <Link href="/delivery" className="text-brand-blue-400 underline">
            Delivery information
          </Link>
        </p>
      </section>
    </>
  )
}
