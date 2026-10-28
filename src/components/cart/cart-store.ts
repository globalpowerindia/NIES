'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

import type { CartView } from '@/lib/storefront/cart'

/**
 * The shopper's cart, shared by the header badge, every Add to Cart button and
 * the cart page. Pages around it are cached and identical for everyone, so the
 * cart fills in from the browser: one request per page load, and every change
 * replies with the whole cart, so the badge and totals can't drift apart.
 */

export type CartToast = { id: number; kind: 'added' | 'notice' | 'error'; message: string }

type State = { loaded: boolean; cart: CartView | null; toast: CartToast | null }

// The server render (and the first client render, before hydration) sees this
// initial state, so markup matches until the cart has loaded.
const useCartStore = create<State>(() => ({ loaded: false, cart: null, toast: null }))
const { setState } = useCartStore

let loading: Promise<void> | null = null
let toastId = 0

type Reply = { ok?: boolean; cart?: CartView; error?: string; notice?: string | null }

const load = () => {
  loading ??= fetch('/api/cart', { cache: 'no-store' })
    .then((response) => response.json() as Promise<Reply>)
    .then((reply) => setState({ loaded: true, cart: reply.cart ?? null }))
    .catch(() => setState({ loaded: true }))
  return loading
}

/** Starts from server-rendered data (the cart page) so it shows without a second fetch. */
export const seedCart = (cart: CartView) => {
  loading ??= Promise.resolve()
  setState({ loaded: true, cart })
}

export const showCartToast = (kind: CartToast['kind'], message: string) =>
  setState({ toast: { id: ++toastId, kind, message } })

export type CartResult = { ok: boolean; error?: string; notice?: string }

const send = async (method: string, path: string, body?: unknown): Promise<CartResult> => {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null)
  const reply: Reply = response ? await response.json().catch(() => ({})) : {}
  if (reply.cart) setState({ loaded: true, cart: reply.cart })
  if (!response?.ok) {
    return { ok: false, error: reply.error ?? 'Something went wrong. Please try again.' }
  }
  return { ok: true, notice: reply.notice ?? undefined }
}

export const useCart = () => {
  const current = useCartStore()
  useEffect(() => {
    void load()
  }, [])
  return current
}

/**
 * Adds a product (its default variant) or a specific variant. Says what
 * happened in a toast, unless `quiet` because the caller is moving on, e.g.
 * Buy Now going straight to the cart.
 */
export const addToCart = async (
  input: { productId?: number; variantId?: number; quantity?: number },
  { quiet = false }: { quiet?: boolean } = {},
): Promise<CartResult> => {
  const result = await send('POST', '/api/cart/items', input)
  if (!quiet || !result.ok) {
    if (!result.ok) showCartToast('error', result.error!)
    else showCartToast(result.notice ? 'notice' : 'added', result.notice ?? 'Added to your cart.')
  }
  return result
}

export const setCartQuantity = (variantId: number, quantity: number) =>
  send('PATCH', `/api/cart/items/${variantId}`, { quantity })

export const removeFromCart = (variantId: number) => send('DELETE', `/api/cart/items/${variantId}`)

/** Returns the reason a code was refused, for showing under the code box. */
export const applyCoupon = (code: string) => send('POST', '/api/cart/coupon', { code })

export const removeCoupon = () => send('DELETE', '/api/cart/coupon')
