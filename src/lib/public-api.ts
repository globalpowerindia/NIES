import { APIError, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

import { staffOf } from '@/access/permissions'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'

/**
 * Payload mounts a REST API for every collection. The storefront reads through
 * the Local API and only the admin calls REST from a browser, so anyone else
 * asking gets small pages at a limited rate: without this, one request can ask
 * for every product at any depth, as often as it likes.
 */

export const PUBLIC_MAX_LIMIT = 100
export const PUBLIC_MAX_DEPTH = 2

export const limitPublicReads: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'read' || req.payloadAPI !== 'REST' || staffOf(req.user)) return args

  // Loading a document's relationships runs more reads on this same request.
  // Only the first is the caller's: the rest mustn't count, or lose rows to the cap.
  if (req.context.publicReadChecked) return args
  req.context.publicReadChecked = true

  const result = await rateLimit(req.payload, `rest:ip:${clientIp(req)}`, LIMITS.publicRead)
  if (!result.ok) throw new APIError('Too many requests. Please wait a moment and try again.', 429)

  const read = args as { depth?: number; limit?: number; pagination?: boolean }
  // `limit=0` and `pagination=false` both mean "everything".
  if (read.limit !== undefined) read.limit = read.limit > 0 ? Math.min(read.limit, PUBLIC_MAX_LIMIT) : PUBLIC_MAX_LIMIT
  if (read.pagination === false) read.pagination = true
  if (read.depth !== undefined) read.depth = Math.min(read.depth, PUBLIC_MAX_DEPTH)
  return args
}

export const withPublicReadLimits = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  hooks: {
    ...collection.hooks,
    beforeOperation: [limitPublicReads, ...(collection.hooks?.beforeOperation ?? [])],
  },
})
