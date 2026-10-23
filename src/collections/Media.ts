import type { CollectionConfig } from 'payload'

import { anyone, isManager, isStaff } from '@/access/roles'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: { afterChange: [revalidateStorefront], afterDelete: [revalidateStorefrontOnDelete] },
  admin: { group: 'Catalog' },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isManager,
  },
  upload: {
    externalFileHeaderFilter: () => ({}),
    // Product videos live here too; Payload only makes the resized copies below for images.
    // Named types, never `image/*`: that admits SVG, which is a document that can run script.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'],
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
      admin: {
        description: 'Describes the image or video for screen readers and search engines.',
      },
    },
  ],
}
