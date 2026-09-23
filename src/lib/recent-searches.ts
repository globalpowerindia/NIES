/**
 * Recent searches are per-device, not per-account: they live in localStorage so
 * they work for guests, and "Clear History" genuinely clears them. Customer
 * accounts (Module 5) don't change this — a shopper's browser is the right
 * scope for a convenience list nobody should have to log in to see.
 *
 * Every access is guarded: private windows, blocked site data and SSR all make
 * `localStorage` throw or vanish, and none of those should break the header.
 */

const KEY = 'ph:recent-searches'
const LIMIT = 5
/** Long enough for "cordless impact driver 18v", short enough to bound the row. */
const MAX_LENGTH = 64

export const readRecentSearches = (): string[] => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, LIMIT)
  } catch {
    return []
  }
}

/** Most recent first, case-insensitively de-duplicated, capped at {@link LIMIT}. */
export const addRecentSearch = (query: string): string[] => {
  const term = query.trim().slice(0, MAX_LENGTH)
  if (!term) return readRecentSearches()

  const next = [term, ...readRecentSearches().filter((entry) => entry.toLowerCase() !== term.toLowerCase())].slice(
    0,
    LIMIT,
  )
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // A full or blocked store costs the shopper the history, nothing more.
  }
  return next
}

export const clearRecentSearches = (): void => {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to do: the list is already unreadable.
  }
}
