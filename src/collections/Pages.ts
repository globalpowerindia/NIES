import type { CollectionConfig, TextField, TextFieldSingleValidation } from 'payload'

import { isManager, isStaff, isSuperAdmin } from '@/access/roles'
import { slugFrom } from '@/fields/slug'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'

/** Top-level paths the storefront already uses; a page can't take one. */
export const RESERVED_PAGE_SLUGS = [
  'account', 'admin', 'api', 'app', 'brand', 'cart', 'catalogue', 'category', 'checkout', 'login',
  'offers', 'price-list', 'products', 'register', 'search', 'next', 'media',
]

const slugField = slugFrom('title') as TextField & { hasMany?: false }
const validateSlug: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && RESERVED_PAGE_SLUGS.includes(value)
    ? `"${value}" is already a storefront address. Choose another slug.`
    : true

/**
 * Plain content pages at the site root: About Us, the delivery, privacy,
 * return and terms policies, and anything else staff need. Razorpay checks the
 * policy pages exist before it activates live payments.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    useAsTitle: 'title',
    group: 'Storefront',
    defaultColumns: ['title', 'slug', 'isPublished', 'updatedAt'],
    description: 'Shown at the site root, e.g. a page with slug "privacy" is /privacy. Link them from Header & Footer.',
  },
  access: {
    // Visitors only ever see published pages; staff see drafts too.
    read: (args) => (isStaff(args) ? true : { isPublished: { equals: true } }),
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: { afterChange: [revalidateStorefront], afterDelete: [revalidateStorefrontOnDelete] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { ...slugField, validate: validateSlug },
    {
      name: 'isPublished',
      label: 'Published',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Off: the page shows "not found" to visitors.' },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'One or two sentences for search results.' },
    },
    { name: 'content', type: 'richText', required: true },
  ],
}
