/**
 * Recently viewed products are per-device, like recent searches: localStorage,
 * so they work for guests. Ids only: the cards are fetched fresh, so a price is
 * never stale and a product taken off sale simply drops out.
 *
 * Every access is guarded: private windows and blocked site data make
 * `localStorage` throw, and neither should break a page.
 */

const KEY = 'ph:recently-viewed'
export const RECENTLY_VIEWED_LIMIT = 12

export const readRecentlyViewed = (): number[] => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, RECENTLY_VIEWED_LIMIT)
  } catch {
    return []
  }
}

/** Most recent first, without repeats. */
export const addRecentlyViewed = (productId: number): void => {
  const next = [productId, ...readRecentlyViewed().filter((id) => id !== productId)].slice(0, RECENTLY_VIEWED_LIMIT)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // A full or blocked store costs the shopper the list, nothing more.
  }
}
