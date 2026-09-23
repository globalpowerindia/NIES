import { getPayload } from 'payload'

import config from '../payload.config.js'

/**
 * Rebuilds every product's search document.
 *
 * `fillSearchDocument` keeps it current on save, and hooks on brands,
 * categories and variants cover the indirect changes — but nothing rewrites
 * rows that already existed when the document's shape changed. Run this after
 * editing what goes into searchA/B/C, or to repair drift.
 *
 *   npm run search:reindex
 */
const run = async () => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'products', pagination: false, depth: 0 })

  for (const { id } of docs) {
    await payload.update({ collection: 'products', id, data: {}, context: { skipRevalidate: true } })
  }

  payload.logger.info(`[search] reindexed ${docs.length} products`)
  process.exit(0)
}

void run()
