import { revalidatePath, revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

/** Every cached storefront read carries this tag, so one purge refreshes them all. */
export const STOREFRONT_TAG = 'storefront'

/**
 * Next's data cache outlives a deploy, so a cached result from the previous
 * release could reach code expecting a different shape. Keying every entry by
 * deployment starts each release with an empty cache.
 */
export const CACHE_VERSION = process.env.VERCEL_DEPLOYMENT_ID ?? 'local'

/**
 * Options for every cached storefront read. Admin saves purge at once; the
 * hour is a backstop for writes no hook sees (import and reindex scripts,
 * edits made straight in the database).
 */
export const STOREFRONT_CACHE = { tags: [STOREFRONT_TAG], revalidate: 3600 }

/**
 * Storefront pages are prerendered and their data cached, so an admin save has
 * to purge both. Seeds and scripts run outside a Next request, where these
 * throw; they pass `context.skipRevalidate` or simply hit the catch.
 */
export const purgeStorefront = (context: Record<string, unknown> | undefined) => {
  if (context?.skipRevalidate) return
  try {
    // Prices and stock must not be served stale, so the next request reloads.
    revalidateTag(STOREFRONT_TAG, { expire: 0 })
    revalidatePath('/', 'layout')
  } catch {
    // Not inside a Next request (seed, CLI). The cache catches up within the hour.
  }
}

export const revalidateStorefrontGlobal: GlobalAfterChangeHook = ({ doc, context }) => {
  purgeStorefront(context)
  return doc
}

export const revalidateStorefront: CollectionAfterChangeHook = ({ doc, context }) => {
  purgeStorefront(context)
  return doc
}

export const revalidateStorefrontOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  purgeStorefront(req.context)
  return doc
}
