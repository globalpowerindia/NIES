import type { CollectionConfig } from 'payload'

import { MODEL_MIME, validateModelUpload } from '@/lib/product-model'

import { allow, anyone, hiddenUnless } from '@/access/roles'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: { beforeOperation: [validateModelUpload], afterChange: [revalidateStorefront], afterDelete: [revalidateStorefrontOnDelete] },
  admin: { hidden: hiddenUnless('media'), group: 'Catalog' },
  access: {
    read: anyone,
    create: allow('media', 'create'),
    update: allow('media', 'update'),
    delete: allow('media', 'delete'),
  },
  upload: {
    externalFileHeaderFilter: () => ({}),
    // Product videos live here too; Payload only makes the resized copies below for images.
    // Named types, never `image/*`: that admits SVG, which is a document that can run script.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', MODEL_MIME],
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
        description: 'Describes the image, video or 3D model for screen readers and search engines.',
      },
    },
  ],
}
