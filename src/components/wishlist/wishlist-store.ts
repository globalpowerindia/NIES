'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

/**
 * Which products the shopper has hearted, shared by every heart on the page.
 *
 * Product pages and listings are static, so the hearts fill in from the
 * browser: one request per page load however many cards there are, and a
 * change to one heart shows on every other heart for the same product.
 */

type State = { loaded: boolean; signedIn: boolean; ids: ReadonlySet<number> }

// The server render sees this initial state, so markup matches until the hearts have loaded.
const useWishlistStore = create<State>(() => ({ loaded: false, signedIn: false, ids: new Set() }))
const { getState, setState } = useWishlistStore

let loading: Promise<void> | null = null

const load = () => {
  loading ??= fetch('/api/account/wishlist', { cache: 'no-store' })
    .then((response) => response.json())
    .then((reply: { signedIn?: boolean; productIds?: number[] }) =>
      setState({
        loaded: true,
        signedIn: Boolean(reply.signedIn),
        ids: new Set(reply.productIds ?? []),
      }),
    )
    .catch(() => setState({ loaded: true }))
  return loading
}

export const useWishlist = () => {
  const current = useWishlistStore()
  useEffect(() => {
    void load()
  }, [])
  return current
}

/**
 * Hearts or un-hearts a product, showing the change at once and undoing it if
 * the server says no. Returns false when the shopper needs to sign in first.
 */
export const toggleWishlist = async (productId: number): Promise<boolean> => {
  await load()
  const before = getState()
  if (!before.signedIn) return false

  const had = before.ids.has(productId)
  const optimistic = new Set(before.ids)
  if (had) optimistic.delete(productId)
  else optimistic.add(productId)
  setState({ ids: optimistic })

  const response = await fetch(
    had ? `/api/account/wishlist/${productId}` : '/api/account/wishlist',
    had
      ? { method: 'DELETE' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        },
  ).catch(() => null)

  if (!response?.ok) {
    // Read again: other hearts may have changed while this request was out.
    const now = getState()
    const reverted = new Set(now.ids)
    if (had) reverted.add(productId)
    else reverted.delete(productId)
    setState({ ids: reverted, signedIn: response?.status !== 401 && now.signedIn })
    return response?.status !== 401
  }
  return true
}
