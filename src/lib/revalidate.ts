import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'

/**
 * Storefront pages are prerendered, so an admin save has to purge them. Seeds
 * and scripts run outside a Next request, where revalidatePath throws; they
 * pass `context.skipRevalidate` or simply hit the catch.
 */
const purge = (context: Record<string, unknown> | undefined) => {
  if (context?.skipRevalidate) return
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Not inside a Next request (seed, CLI). Nothing is cached there.
  }
}

export const revalidateStorefrontGlobal: GlobalAfterChangeHook = ({ doc, context }) => {
  purge(context)
  return doc
}

export const revalidateStorefront: CollectionAfterChangeHook = ({ doc, context }) => {
  purge(context)
  return doc
}
