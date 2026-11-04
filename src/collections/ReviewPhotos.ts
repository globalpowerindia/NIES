import type { CollectionConfig } from 'payload'

import { can } from '@/access/permissions'
import { allow } from '@/access/roles'

/**
 * Photos customers attach to their reviews. Apart from the Media library, as
 * these are unmoderated uploads from the public, and every Media save purges
 * the storefront cache. Staff see them on the review they belong to.
 *
 * The API is closed to the public so nobody can list photos awaiting approval.
 * The product page reads a review's photos on the server, once it is approved.
 */
export const ReviewPhotos: CollectionConfig = {
  slug: 'review-photos',
  admin: { hidden: true, useAsTitle: 'filename' },
  access: {
    read: allow('reviews', 'read'),
    create: allow('reviews', 'create'),
    update: allow('reviews', 'update'),
    delete: allow('reviews', 'delete'),
  },
  upload: {
    externalFileHeaderFilter: () => ({}),
    // The storefront route re-encodes every photo to WebP before it gets here.
    mimeTypes: ['image/webp'],
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      index: true,
      access: { read: ({ req }) => can(req.user, 'reviews', 'read') },
      admin: { readOnly: true },
    },
  ],
}
