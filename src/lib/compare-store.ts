/**
 * The products a shopper picked to compare, per device, like recently viewed:
 * localStorage, so it works for guests. Ids only, so prices are never stale.
 * One category at a time; picking in another category starts over.
 *
 * Every access is guarded: private windows and blocked site data make
 * `localStorage` throw, and neither should break a page.
 */

import { parseCompareIds } from '@/lib/compare-rules'

const KEY = 'ph:compare'

export const readComparison = (categoryId: number): number[] | null => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as { categoryId?: unknown; ids?: unknown }
    if (saved.categoryId !== categoryId || !Array.isArray(saved.ids)) return null
    const ids = parseCompareIds(saved.ids.join(','))
    return ids.length > 0 ? ids : null
  } catch {
    return null
  }
}

export const saveComparison = (categoryId: number, ids: number[]): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ categoryId, ids }))
  } catch {
    // A full or blocked store costs the shopper their picks, nothing more.
  }
}
