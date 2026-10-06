import type { GlobalConfig } from 'payload'

import { publishedHome, isManager, isStaff } from '@/access/roles'
import { HOME_BLOCKS } from '@/globals/home-blocks'
import { revalidateStorefrontGlobal } from '@/lib/revalidate'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Homepage',
  admin: {
    group: 'Storefront',
    description:
      'Every section of the homepage, top to bottom. Drag to reorder, hide a section without deleting it, and save a draft before publishing.',
  },
  access: {
    read: publishedHome,
    readVersions: isStaff,
    update: isManager,
  },
  versions: {
    drafts: true,
    max: 30,
  },
  hooks: {
    afterChange: [
      (args) => (args.doc?._status === 'draft' ? args.doc : revalidateStorefrontGlobal(args)),
    ],
  },
  fields: [
    {
      name: 'sections',
      type: 'blocks',
      blocks: HOME_BLOCKS,
      admin: { initCollapsed: true },
    },
  ],
}
