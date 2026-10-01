'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { addToCart } from '@/components/cart/cart-store'
import { Button } from '@/components/ui/Button'

type Props = Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  productId?: number
  variantId?: number
  quantity?: number
  /** Buy Now adds, then goes straight to the cart. */
  buyNow?: boolean
  children: ReactNode
}

/**
 * Add to Cart and Buy Now, wherever a product appears. Product cards send the
 * product, and the server picks the variant the card is priced from; the
 * product page sends the exact variant on show.
 */
export const AddToCartButton = ({
  productId,
  variantId,
  quantity = 1,
  buyNow = false,
  children,
  disabled,
  ...rest
}: Props) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <Button
      {...rest}
      type="button"
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true)
        const result = await addToCart({ productId, variantId, quantity }, { quiet: buyNow })
        if (result.ok && buyNow) router.push('/cart')
        else setBusy(false)
      }}
    >
      {children}
    </Button>
  )
}
