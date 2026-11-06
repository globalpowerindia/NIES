'use client'

import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useState } from 'react'

import { addToCart, showCartToast } from '@/components/cart/cart-store'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/money'
import type { BoughtTogetherItem } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

/**
 * This product and the ones staff picked to go with it (Products → Classification →
 * Frequently bought together). Shoppers untick what they don't need and add the rest
 * in one go. Items that can't go in the cart (sold offline, out of stock) are shown
 * but can't be ticked.
 */
export const BoughtTogether = ({ current, items }: { current: BoughtTogetherItem; items: BoughtTogetherItem[] }) => {
  const all = [current, ...items]
  const [picked, setPicked] = useState(() => new Set(all.filter((item) => item.buyable).map((item) => item.productId)))
  const [busy, setBusy] = useState(false)

  const chosen = all.filter((item) => item.buyable && picked.has(item.productId))
  const total = chosen.reduce((sum, item) => sum + item.pricePaise, 0)
  const mrpTotal = chosen.reduce((sum, item) => sum + Math.max(item.mrpPaise, item.pricePaise), 0)

  const toggle = (productId: number) =>
    setPicked((previous) => {
      const next = new Set(previous)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })

  const addAll = async () => {
    setBusy(true)
    let added = 0
    for (const item of chosen) {
      const result = await addToCart({ variantId: item.variantId, quantity: 1 }, { quiet: true })
      if (!result.ok) {
        showCartToast('error', `${item.name}: ${result.error}`)
        continue
      }
      added += 1
    }
    setBusy(false)
    if (added > 0) {
      showCartToast('added', added === 1 ? 'Added 1 item to your cart.' : `Added ${added} items to your cart.`)
    }
  }

  const label = chosen.length === 1 ? 'Add to Cart' : chosen.length === all.length ? `Add all ${chosen.length} to Cart` : `Add ${chosen.length} to Cart`

  return (
    <section
      aria-labelledby="bought-together-heading"
      className="flex flex-col gap-4 rounded-2xl border-[0.5px] border-dark-100 bg-light-100 p-4 shadow-[0_4px_16px_#1c1c1c1a] lg:p-6"
    >
      <h2 id="bought-together-heading" className="text-body1 font-semibold text-dark-500 lg:text-h4">
        Frequently bought together
      </h2>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-col gap-4">
          {/* The photos, joined by plus signs. Scrolls sideways on a phone. */}
          <ol className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {all.map((item, index) => {
              const on = item.buyable && picked.has(item.productId)
              return (
                <Fragment key={item.productId}>
                  {index > 0 && (
                    <li aria-hidden className="shrink-0 text-dark-300">
                      <Plus className="size-5" />
                    </li>
                  )}
                  <li className="shrink-0">
                    <Link
                      href={item.href}
                      aria-label={item.name}
                      className={cn(
                        'relative block size-24 overflow-hidden rounded-xl border-[0.5px] border-dark-100 bg-light-100 transition-opacity lg:size-28',
                        !on && 'opacity-40',
                      )}
                    >
                      <Image src={item.image} alt="" fill sizes="112px" className="object-contain p-2" />
                    </Link>
                  </li>
                </Fragment>
              )
            })}
          </ol>

          <ul className="flex flex-col gap-2">
            {all.map((item, index) => (
              <li key={item.productId}>
                <label
                  className={cn(
                    'flex items-start gap-2 text-body3 text-dark-500 lg:text-body1',
                    item.buyable ? 'cursor-pointer' : 'cursor-not-allowed text-dark-300',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.buyable && picked.has(item.productId)}
                    disabled={!item.buyable || busy}
                    onChange={() => toggle(item.productId)}
                    className="mt-1 size-4 shrink-0 accent-brand-red-500"
                  />
                  <span className="min-w-0">
                    {index === 0 ? (
                      <span className="font-semibold">This item: </span>
                    ) : null}
                    {index === 0 ? (
                      item.name
                    ) : (
                      <Link href={item.href} className="text-brand-blue-400 hover:underline">
                        {item.name}
                      </Link>
                    )}{' '}
                    <span className="font-semibold whitespace-nowrap">
                      {item.pricePaise > 0 ? formatCurrency(item.pricePaise) : 'Price on request'}
                    </span>
                    {item.pricePaise > 0 && item.mrpPaise > item.pricePaise && (
                      <span className="ml-1.5 whitespace-nowrap text-dark-300 line-through">
                        {formatCurrency(item.mrpPaise)}
                      </span>
                    )}
                    {!item.buyable && <span className="ml-1.5 whitespace-nowrap">· Enquire to buy</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col gap-3 rounded-xl bg-light-400 p-4 xl:w-64">
          {chosen.length > 0 ? (
            <>
              <p className="flex flex-col text-body3 text-dark-400 lg:text-body1">
                Total price
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-h5 font-bold text-dark-500">{formatCurrency(total)}</span>
                  {mrpTotal > total && (
                    <span className="text-body3 text-dark-300 line-through lg:text-body1">{formatCurrency(mrpTotal)}</span>
                  )}
                </span>
                {mrpTotal > total && (
                  <span className="font-medium text-green-400">You save {formatCurrency(mrpTotal - total)}</span>
                )}
              </p>
              <Button
                type="button"
                onClick={addAll}
                disabled={busy}
                aria-busy={busy}
                className="h-11 w-full bg-brand-red-500 text-body3 hover:bg-brand-red-400 lg:text-body1"
              >
                {busy ? 'Adding…' : label}
              </Button>
            </>
          ) : (
            <p className="text-body3 text-dark-400 lg:text-body1">Tick the items you want to add them together.</p>
          )}
        </div>
      </div>
    </section>
  )
}
