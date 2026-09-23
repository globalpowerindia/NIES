import { getPayload } from 'payload'

import { searchProducts } from '../lib/storefront/search.js'
import config from '../payload.config.js'

/** Ad-hoc probe for the search pipeline. `npm run search:check` */
const run = async () => {
  const payload = await getPayload({ config })

  const queries = [
    'drill',
    'drills',
    'GPG-6D',
    'gpg 6d',
    'HCC6110',
    'angle grinder',
    'power tools',
    'grindr',
    'makitta',
    'zzzznothing',
    // Synonyms: none of these words appear in the catalogue text.
    'jackhammer',
    'breaker',
    'tile cutter',
    'buffer',
    'hammer drill',
  ]

  for (const query of queries) {
    const { ids, corrected, exactId } = await searchProducts(payload, query)
    const top = ids.slice(0, 3)
    const found = ids.length
      ? (await payload.find({ collection: 'products', where: { id: { in: top } }, pagination: false, depth: 0 })).docs
      : []
    // `find` returns its own order; restore the ranking before printing.
    const byId = new Map(found.map((d) => [d.id, d.name]))
    const names = top.map((id) => byId.get(id)).filter(Boolean)
    const flag = corrected ? '[fuzzy]' : exactId ? '[exact]' : '       '
    console.log(`${query.padEnd(14)} -> ${String(ids.length).padStart(2)} hit(s) ${flag}  ${names.join(' | ')}`)
  }

  process.exit(0)
}

void run()
