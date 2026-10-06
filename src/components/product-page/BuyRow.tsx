'use client'

import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { MAX_LINE_QTY as MAX_QTY } from '@/lib/cart-rules'

const stepper =
  'grid size-8 place-items-center rounded-full border-[0.5px] border-brand-blue-200 bg-brand-blue-100 text-dark-500 transition-colors hover:bg-brand-blue-200 disabled:opacity-40 lg:size-[50px]'

/** Quantity and the two purchase buttons, for the variant on show. */
export const BuyRow = ({
  name,
  variantId,
  inStock,
}: {
  name: string
  variantId: number
  inStock: boolean
}) => {
  const [qty, setQty] = useState(1)

  return (
    <div className="flex min-h-10 flex-col gap-4 min-[103.25rem]:flex-row min-[103.25rem]:items-center">
      <div className="flex items-center gap-4">
        <span className="text-body3 font-medium text-dark-500 lg:text-body1">Qty</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={stepper}
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            disabled={!inStock || qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-5 lg:size-7" strokeWidth={1.5} />
          </button>
          <output
            aria-live="polite"
            aria-label="Quantity"
            className="w-6 text-center text-body2 font-medium text-dark-500 lg:w-10 lg:text-h5"
          >
            {qty}
          </output>
          <button
            type="button"
            className={stepper}
            onClick={() => setQty((value) => Math.min(MAX_QTY, value + 1))}
            disabled={!inStock || qty >= MAX_QTY}
            aria-label="Increase quantity"
          >
            <Plus className="size-5 lg:size-7" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 bg-light-400 px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_#0000000a] lg:static lg:flex-1 lg:bg-transparent lg:p-0 lg:shadow-none">
        {inStock ? (
          <div className="mx-auto flex w-full max-w-[700px] gap-2 lg:max-w-none">
            <AddToCartButton
              variantId={variantId}
              quantity={qty}
              buyNow
              variant="blue"
              size="tall"
              className="h-10 min-w-0 flex-1 px-3 text-body3 lg:h-13 lg:px-6 lg:text-body2"
              aria-label={`Buy ${qty} × ${name} now`}
            >
              Buy Now
            </AddToCartButton>
            <AddToCartButton
              variantId={variantId}
              quantity={qty}
              size="tall"
              className="h-10 min-w-0 flex-1 bg-brand-red-400 px-3 text-body3 hover:bg-brand-red-500 lg:h-13 lg:bg-brand-red-500 lg:px-6 lg:text-body2"
              aria-label={`Add ${qty} × ${name} to cart`}
            >
              Add to Cart
            </AddToCartButton>
          </div>
        ) : (
          <p className="flex h-13 flex-1 items-center justify-center rounded-xl bg-brand-red-100 text-body2 font-medium text-brand-red-500">
            Out Of Stock
          </p>
        )}
      </div>
    </div>
  )
}
