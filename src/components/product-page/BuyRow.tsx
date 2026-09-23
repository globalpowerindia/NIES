'use client'

import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'

const MAX_QTY = 20

const stepper =
  'grid size-10 place-items-center rounded-full border-[0.5px] border-brand-blue-200 bg-brand-blue-100 text-dark-500 transition-colors hover:bg-brand-blue-200 disabled:opacity-40 sm:size-[50px]'

/**
 * Quantity and the two purchase buttons. The cart arrives with the cart
 * module; until then the buttons render in their final place and state.
 */
export const BuyRow = ({ name, inStock }: { name: string; inStock: boolean }) => {
  const [qty, setQty] = useState(1)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <span className="text-body1 font-medium text-dark-500">Qty</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={stepper}
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            disabled={!inStock || qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-6 sm:size-7" strokeWidth={1.5} />
          </button>
          <output aria-live="polite" aria-label="Quantity" className="w-10 text-center text-h5 font-medium text-dark-500">
            {qty}
          </output>
          <button
            type="button"
            className={stepper}
            onClick={() => setQty((value) => Math.min(MAX_QTY, value + 1))}
            disabled={!inStock || qty >= MAX_QTY}
            aria-label="Increase quantity"
          >
            <Plus className="size-6 sm:size-7" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {inStock ? (
        <div className="flex flex-1 gap-2">
          <Button variant="blue" size="tall" className="flex-1" aria-label={`Buy ${qty} × ${name} now`}>
            Buy Now
          </Button>
          <Button size="tall" className="flex-1 bg-brand-red-500 hover:bg-brand-red-400" aria-label={`Add ${qty} × ${name} to cart`}>
            Add to Cart
          </Button>
        </div>
      ) : (
        <p className="flex h-13 flex-1 items-center justify-center rounded-xl bg-brand-red-100 text-body2 font-medium text-brand-red-500">
          Out Of Stock
        </p>
      )}
    </div>
  )
}
