import type { CollectionConfig } from 'payload'

import { anyone, isManager, isStaff } from '@/access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Catalog' },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isManager,
  },
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1600 },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Describes the image for screen readers and search engines.' },
    },
  ],
}
