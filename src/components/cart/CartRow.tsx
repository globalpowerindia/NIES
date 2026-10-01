'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { removeFromCart, setCartQuantity, showCartToast } from '@/components/cart/cart-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/money'
import type { CartLineView } from '@/lib/storefront/cart'
import { cn } from '@/lib/utils'

const STATUS_NOTE: Partial<Record<CartLineView['status'], (line: CartLineView) => string>> = {
  LIMITED: (line) => `Only ${line.maxQuantity} available. Reduce the quantity to continue.`,
  OUT_OF_STOCK: () => 'Out of stock. Remove it to continue.',
  UNAVAILABLE: () => 'This product is no longer sold. Remove it to continue.',
}

/** One cart line, from Figma node 1096:27821. */
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
      sizes="156px"
      className={cn('object-contain', !buyable && 'opacity-40')}
    />
  )

  return (
    <article
      aria-busy={busy}
      className={cn(
        'flex flex-col gap-4 rounded-xl border-[0.5px] px-5 py-3 sm:flex-row sm:gap-10',
        note ? 'border-brand-red-300' : 'border-dark-100',
      )}
    >
      {line.href ? (
        <Link
          href={line.href}
          className="relative block size-39 shrink-0 self-center sm:self-start"
        >
          {image}
        </Link>
      ) : (
        <div className="relative size-39 shrink-0 self-center sm:self-start">{image}</div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 sm:flex-row sm:py-4">
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {line.href ? (
              <Link
                href={line.href}
                className="text-h5 font-medium text-dark-500 hover:text-brand-blue-500"
              >
                {line.name}
              </Link>
            ) : (
              <p className="text-h5 font-medium text-dark-300">{line.name}</p>
            )}
            {subtitle && <p className="text-label1 text-dark-300">{subtitle}</p>}
            {note && (
              <p role="status" className="text-label1 font-medium text-brand-red-500">
                {note}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => run(() => removeFromCart(line.variantId))}
            disabled={busy}
            className="flex items-center gap-1 self-start text-body1 font-medium text-brand-red-500 transition-opacity hover:opacity-80 disabled:opacity-60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a 24px SVG icon. */}
            <img src="/icons/delete.svg" alt="" width={24} height={24} className="size-6" />
            Remove
            <span className="sr-only"> {line.name}</span>
          </button>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-4 sm:items-end">
          {buyable && (
            <div className="flex flex-col gap-1 sm:items-end">
              <p className="text-h4 font-semibold text-dark-500">
                {formatCurrency(line.unitPricePaise * line.quantity)}
              </p>
              {discount !== null && (
                <div className="flex items-center gap-1">
                  <span className="text-label1 text-dark-300 line-through">
                    <span className="sr-only">MRP </span>
                    {formatCurrency(line.mrpPaise * line.quantity)}
                  </span>
                  <span className="flex h-5.5 items-center gap-1 text-label2 font-medium whitespace-nowrap text-brand-blue-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/offer.svg" alt="" width={20} height={20} className="size-5" />
                    {discount}% off
                  </span>
                </div>
              )}
              {line.quantity > 1 && (
                <p className="text-label2 text-dark-300">
                  {formatCurrency(line.unitPricePaise)} each
                </p>
              )}
            </div>
          )}

          {line.status !== 'UNAVAILABLE' && (
            <Select
              value={String(line.quantity)}
              onValueChange={(quantity) =>
                run(() => setCartQuantity(line.variantId, Number(quantity)))
              }
              disabled={busy || line.status === 'OUT_OF_STOCK'}
            >
              {/* The Figma chip (1096:27864): "Qty:", the number, and the design's arrow. */}
              <SelectTrigger
                aria-label={`Quantity of ${line.name}`}
                className="cursor-pointer gap-2.5 self-start rounded-sm bg-dark-100 py-1 pr-1 pl-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500 disabled:cursor-default disabled:opacity-100 sm:self-end"
                icon={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/icons/arrow-down-filled.svg" alt="" width={24} height={24} className="size-6" />
                }
              >
                <span className="text-body1 font-medium text-dark-400">Qty:</span>
                <span className="-mr-2.5 text-body2 font-medium text-dark-500">
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
        </div>
      </div>
    </article>
  )
}
