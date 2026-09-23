import type { CollectionConfig } from 'payload'

import { anyone, isManager, isSuperAdmin } from '@/access/roles'

/**
 * Neon does not allow the custom thesaurus files Postgres would normally use
 * for synonyms, so they live here instead and the query is expanded in app code
 * before it reaches the database (see `expandQuery` in lib/storefront/search.ts).
 *
 * Staff maintain this from the zero-result queries in the search log: when
 * shoppers keep searching a word the catalogue doesn't use, add it here.
 */
export const SearchSynonyms: CollectionConfig = {
  slug: 'search-synonyms',
  labels: { singular: 'Synonym', plural: 'Search synonyms' },
  admin: {
    useAsTitle: 'terms',
    group: 'Storefront',
    defaultColumns: ['terms', 'isActive', 'updatedAt'],
    description: 'Words that mean the same thing to a shopper. Searching any one of them finds all of them.',
  },
  access: {
    read: anyone,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'terms',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'cordless, battery, battery powered',
        description:
          'Comma-separated, and treated as equals in every direction: a search for any one of these also finds the others. Multi-word phrases are fine.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
