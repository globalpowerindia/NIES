'use client'

import { useCallback, useEffect, useState } from 'react'

export type VariantRow = {
  id: number
  sku: string
  name: string
  mrpPaise: number
  sellingPricePaise: number
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

export type StockRow = {
  id: number
  variant: number
  onHand: number
  reserved: number
  lowStockThreshold: number
  allowBackorder: boolean
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}

/** Fired after any price or stock change, so every panel on the page reloads together. */
export const STOCK_CHANGED = 'product-stock-changed'
export const announceStockChange = () => window.dispatchEvent(new Event(STOCK_CHANGED))

const relId = (value: unknown) =>
  typeof value === 'number' ? value : Number((value as { id?: number } | null)?.id)

/**
 * A product's variants and their stock rows, through the admin's own REST API
 * (so staff permissions apply). Reloads whenever any panel announces a change.
 */
export const useProductStock = (productId: number | string | undefined) => {
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [stock, setStock] = useState<Map<number, StockRow>>(new Map())
  const [loading, setLoading] = useState(Boolean(productId))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!productId) return
    try {
      const query = `where[product][equals]=${productId}&depth=0&limit=200`
      const [variantRes, stockRes] = await Promise.all([
        fetch(`/api/product-variants?${query}&sort=sortOrder`, { credentials: 'include' }),
        fetch(`/api/inventory?${query}`, { credentials: 'include' }),
      ])
      if (!variantRes.ok || !stockRes.ok) throw new Error('Could not load price and stock.')
      const variantBody = (await variantRes.json()) as { docs: VariantRow[] }
      const stockBody = (await stockRes.json()) as {
        docs: (Omit<StockRow, 'variant'> & { variant: unknown })[]
      }
      setVariants(variantBody.docs)
      setStock(
        new Map(
          stockBody.docs.map((row) => [
            relId(row.variant),
            { ...row, variant: relId(row.variant) },
          ]),
        ),
      )
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load price and stock.')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching on mount; state is set when the request settles
    void load()
    window.addEventListener(STOCK_CHANGED, load)
    return () => window.removeEventListener(STOCK_CHANGED, load)
  }, [load])

  return { variants, stock, loading, error, reload: load }
}

/** Sends a JSON request to the admin API and returns the first error message, if any. */
export const sendJson = async (
  method: string,
  url: string,
  body: unknown,
): Promise<string | null> => {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null)
  if (response?.ok) return null
  const reply = (await response?.json().catch(() => ({}))) as {
    errors?: { message: string; data?: { errors?: { message: string }[] } }[]
  }
  const first = reply?.errors?.[0]
  return (
    first?.data?.errors?.[0]?.message ?? first?.message ?? 'Something went wrong. Please try again.'
  )
}
