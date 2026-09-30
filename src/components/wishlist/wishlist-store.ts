'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * Which products the shopper has hearted, shared by every heart on the page.
 *
 * Product pages and listings are static, so the hearts fill in from the
 * browser: one request per page load however many cards there are, and a
 * change to one heart shows on every other heart for the same product.
 */

type State = { loaded: boolean; signedIn: boolean; ids: ReadonlySet<number> }

let state: State = { loaded: false, signedIn: false, ids: new Set() }
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

const setState = (next: State) => {
  state = next
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

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
    .catch(() => setState({ ...state, loaded: true }))
  return loading
}

const SERVER_STATE: State = { loaded: false, signedIn: false, ids: new Set() }

export const useWishlist = () => {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  )
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
  if (!state.signedIn) return false

  const had = state.ids.has(productId)
  const optimistic = new Set(state.ids)
  if (had) optimistic.delete(productId)
  else optimistic.add(productId)
  setState({ ...state, ids: optimistic })

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
    const reverted = new Set(state.ids)
    if (had) reverted.add(productId)
    else reverted.delete(productId)
    setState({ ...state, ids: reverted, signedIn: response?.status !== 401 && state.signedIn })
    return response?.status !== 401
  }
  return true
}
