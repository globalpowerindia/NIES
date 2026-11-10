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
 * Frequently bought together), each in its own box. The tick box on a box adds
 * it to or takes it out of the bundle, and the strip below adds the bundle in one go.
 * Items that can't go in the cart (sold offline, out of stock, no price) are shown
 * without the tick box.
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

      {/* One box per product, joined by plus signs. Scrolls sideways when they don't fit. */}
      <ol className="-mx-4 -my-3 flex items-stretch overflow-x-auto px-4 py-3 [scrollbar-width:none] lg:-mx-2 lg:px-2 [&::-webkit-scrollbar]:hidden">
        {all.map((item, index) => {
          const on = item.buyable && picked.has(item.productId)
          return (
            <Fragment key={item.productId}>
              {index > 0 && (
                <li aria-hidden className="grid shrink-0 place-items-center px-1.5 lg:px-2">
                  <span className="grid size-6 place-items-center rounded-full bg-light-500 text-dark-400">
                    <Plus className="size-3.5" strokeWidth={2.5} />
                  </span>
                </li>
              )}
              <li className="flex w-[8.5rem] shrink-0 lg:w-auto lg:min-w-[6.75rem] lg:flex-1 lg:basis-0">
                <div
                  className={cn(
                    'card-lift relative flex w-full flex-col gap-2 rounded-xl border bg-light-100 p-2 transition-[box-shadow,translate,border-color]',
                    on ? 'border-brand-red-400' : 'border-dark-100',
                  )}
                >
                  {index === 0 && (
                    <span className="absolute top-2 left-2 z-[1] rounded-full bg-brand-blue-500 px-2 py-0.5 text-[0.625rem] leading-4 font-medium text-light-100">
                      This item
                    </span>
                  )}

                  {item.buyable ? (
                    // The label pads the box out to a comfortable tap target.
                    <label className="absolute top-1 right-1 z-[1] grid size-8 cursor-pointer place-items-center">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy}
                        onChange={() => toggle(item.productId)}
                        aria-label={`Include ${item.name}`}
                        className="size-5 cursor-pointer accent-brand-red-500"
                      />
                    </label>
                  ) : null}

                  <Link
                    href={item.href}
                    aria-label={item.name}
                    className="relative block aspect-square w-full overflow-hidden rounded-lg bg-light-300"
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="160px"
                      className={cn('object-contain p-2 transition-opacity', !on && item.buyable && 'opacity-50')}
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={item.href}
                      title={item.name}
                      className="line-clamp-2 text-[0.75rem] leading-4 text-dark-500 hover:text-brand-blue-400 hover:underline lg:text-body3"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-auto flex flex-wrap items-baseline gap-x-1.5 text-body3 lg:text-body2">
                      {item.pricePaise > 0 ? (
                        <>
                          <span className="font-semibold text-dark-500">{formatCurrency(item.pricePaise)}</span>
                          {item.mrpPaise > item.pricePaise && (
                            <span className="text-[0.75rem] text-dark-300 line-through">
                              {formatCurrency(item.mrpPaise)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[0.75rem] font-medium text-dark-400">Price on request</span>
                      )}
                    </p>
                    {!item.buyable && (
                      <span className="self-start rounded-full bg-light-500 px-2 py-0.5 text-[0.625rem] leading-4 font-medium text-dark-400">
                        Enquire to buy
                      </span>
                    )}
                  </div>
                </div>
              </li>
            </Fragment>
          )
        })}
      </ol>

      {/* The bundle's total and one button for all of it. */}
      <div className="flex flex-col gap-3 rounded-xl bg-light-400 p-4 sm:flex-row sm:items-center sm:justify-between">
        {chosen.length > 0 ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body3 text-dark-400 lg:text-body1">
              <span>
                Total for {chosen.length} item{chosen.length === 1 ? '' : 's'}:
              </span>
              <span className="text-h6 font-bold text-dark-500 lg:text-h5">{formatCurrency(total)}</span>
              {mrpTotal > total && (
                <>
                  <span className="text-dark-300 line-through">{formatCurrency(mrpTotal)}</span>
                  <span className="font-medium text-green-400">You save {formatCurrency(mrpTotal - total)}</span>
                </>
              )}
            </p>
            <Button
              type="button"
              onClick={addAll}
              disabled={busy}
              aria-busy={busy}
              className="h-11 w-full shrink-0 bg-brand-red-500 px-6 text-body3 hover:bg-brand-red-400 sm:w-auto lg:text-body1"
            >
              {busy ? 'Adding…' : label}
            </Button>
          </>
        ) : (
          <p className="text-body3 text-dark-400 lg:text-body1">Tick the items you want to buy them together.</p>
        )}
      </div>
    </section>
  )
}
