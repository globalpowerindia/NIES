'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { removeFromCart, setCartQuantity, showCartToast } from '@/components/cart/cart-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/money'
import type { CartLineView } from '@/lib/storefront/cart'
import { cn } from '@/lib/utils'

const STATUS_NOTE: Partial<Record<CartLineView['status'], (line: CartLineView) => string>> = {
  LIMITED: (line) => `Only ${line.maxQuantity} available. Reduce the quantity to continue.`,
  OUT_OF_STOCK: () => 'Out of stock. Remove it to continue.',
  UNAVAILABLE: () => 'This product is no longer sold. Remove it to continue.',
}

/**
 * One cart line: Figma node 1096:27821 from sm up, and the phone card from
 * node 1408:31161 below it. One set of elements is placed by grid areas, so
 * the quantity control and Remove exist once whatever the layout:
 *
 *   phone   img  name          sm+   img  name    price
 *           img  price               img  remove  qty
 *           qty  remove
 */
export const CartRow = ({ line }: { line: CartLineView }) => {
  const [busy, setBusy] = useState(false)
  const note = STATUS_NOTE[line.status]?.(line)
  const buyable = line.status === 'OK' || line.status === 'LIMITED'
  const discount =
    line.mrpPaise > line.unitPricePaise
      ? Math.round(((line.mrpPaise - line.unitPricePaise) / line.mrpPaise) * 100)
      : null
  // An over-limit line keeps its own quantity in the list, so it can be seen and lowered.
  const choices = Math.max(line.maxQuantity, line.quantity)
  const subtitle = [line.variantName, line.subtitle].filter(Boolean).join(' · ')

  const run = async (change: () => ReturnType<typeof removeFromCart>) => {
    setBusy(true)
    const result = await change()
    if (!result.ok) showCartToast('error', result.error!)
    else if (result.notice) showCartToast('notice', result.notice)
    setBusy(false)
  }

  const image = (
    <Image
      src={line.imageUrl}
      alt={line.imageAlt}
      fill
      sizes="(min-width: 40rem) 156px, 86px"
      className={cn('object-contain', !buyable && 'opacity-40')}
    />
  )
  // At least the phone design's 86px column; wider only if the quantity chip needs it.
  const imageClass =
    'relative block aspect-square w-full min-w-[5.375rem] self-start [grid-area:img] sm:size-39 sm:min-w-0 sm:mr-6'

  return (
    <article
      aria-busy={busy}
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 rounded-xl border-[0.5px] p-3 [grid-template-areas:"img_name"_"img_price"_"qty_remove"]',
        'sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-[auto_1fr] sm:gap-x-4 sm:gap-y-4 sm:px-5 sm:[grid-template-areas:"img_name_price"_"img_remove_qty"]',
        note ? 'border-brand-red-300' : 'border-dark-100',
      )}
    >
      {line.href ? (
        <Link href={line.href} className={imageClass}>
          {image}
        </Link>
      ) : (
        <div className={imageClass}>{image}</div>
      )}

      <div className="flex min-w-0 flex-col gap-1 [grid-area:name] sm:pt-4">
        {line.href ? (
          <Link
            href={line.href}
            className="line-clamp-2 text-label1 font-medium text-dark-500 hover:text-brand-blue-500 sm:text-h5"
          >
            {line.name}
          </Link>
        ) : (
          <p className="line-clamp-2 text-label1 font-medium text-dark-300 sm:text-h5">
            {line.name}
          </p>
        )}
        {subtitle && <p className="text-label3 text-dark-300 sm:text-label1">{subtitle}</p>}
        {note && (
          <p role="status" className="text-label3 font-medium text-brand-red-500 sm:text-label1">
            {note}
          </p>
        )}
      </div>

      {buyable && (
        <div className="flex flex-col gap-1 [grid-area:price] sm:items-end sm:pt-4">
          <p className="text-h6 font-semibold text-dark-500 sm:text-h4">
            {formatCurrency(line.unitPricePaise * line.quantity)}
          </p>
          {discount !== null && (
            <div className="flex items-center gap-1">
              <span className="text-label2 font-normal text-dark-300 line-through sm:text-label1">
                <span className="sr-only">MRP </span>
                {formatCurrency(line.mrpPaise * line.quantity)}
              </span>
              <span className="flex h-5.5 items-center gap-1 text-label3 whitespace-nowrap text-brand-blue-300 sm:text-label2 sm:font-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/offer-15.svg"
                  alt=""
                  width={15}
                  height={15}
                  className="size-[0.9375rem] sm:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/offer.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="hidden size-5 sm:block"
                />
                {discount}% off
              </span>
            </div>
          )}
          {line.quantity > 1 && (
            <p className="text-label3 text-dark-300 sm:text-label2">
              {formatCurrency(line.unitPricePaise)} each
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => run(() => removeFromCart(line.variantId))}
        disabled={busy}
        className="mt-2 flex items-center gap-1 self-center justify-self-end text-body3 font-medium text-brand-red-500 transition-opacity [grid-area:remove] hover:opacity-80 disabled:opacity-60 sm:mt-0 sm:mb-4 sm:self-end sm:justify-self-start sm:text-body1"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a 19px SVG icon. */}
        <img
          src="/icons/delete-19.svg"
          alt=""
          width={19}
          height={19}
          className="size-[1.1875rem] sm:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- a 24px SVG icon. */}
        <img
          src="/icons/delete.svg"
          alt=""
          width={24}
          height={24}
          className="hidden size-6 sm:block"
        />
        Remove
        <span className="sr-only"> {line.name}</span>
      </button>

      {line.status !== 'UNAVAILABLE' && (
        <Select
          value={String(line.quantity)}
          onValueChange={(quantity) => run(() => setCartQuantity(line.variantId, Number(quantity)))}
          disabled={busy || line.status === 'OUT_OF_STOCK'}
        >
          {/* The Figma chip (1096:27864): "Qty:", the number, and the design's arrow. */}
          <SelectTrigger
            aria-label={`Quantity of ${line.name}`}
            className="mt-2 cursor-pointer gap-2.5 self-center justify-self-stretch rounded-sm bg-dark-100 py-1 pr-1 pl-3 [grid-area:qty] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500 disabled:cursor-default disabled:opacity-100 sm:mt-0 sm:mb-4 sm:self-end sm:justify-self-end"
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/icons/arrow-down-filled.svg"
                alt=""
                width={24}
                height={24}
                className="size-6"
              />
            }
          >
            <span className="text-body3 font-medium text-dark-400 sm:text-body1">Qty:</span>
            <span className="-mr-2.5 text-body3 font-medium text-dark-500 sm:text-body2">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            sideOffset={4}
            className="max-h-72 min-w-24 rounded-sm border-[0.5px] border-dark-100 bg-light-100 p-1 shadow-lg ring-0"
          >
            {Array.from({ length: choices }, (_, index) => String(index + 1)).map((quantity) => (
              <SelectItem
                key={quantity}
                value={quantity}
                className="cursor-pointer rounded-sm px-3 py-1.5 text-body2 font-medium text-dark-500 focus:bg-brand-blue-100"
              >
                {quantity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </article>
  )
}
