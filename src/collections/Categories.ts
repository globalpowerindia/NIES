import type { CollectionConfig } from 'payload'

import { anyone, isManager, isSuperAdmin } from '@/access/roles'
import { slugFrom } from '@/fields/slug'
import { revalidateStorefront } from '@/lib/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    group: 'Catalog',
    defaultColumns: ['name', 'slug', 'parent', 'isActive', 'sortOrder'],
    components: { views: { list: { Component: '/admin/views/CategoriesList#CategoriesList' } } },
  },
  access: {
    read: anyone,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: { afterChange: [revalidateStorefront] },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugFrom('name'),
    { name: 'description', type: 'textarea' },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Square-ish tile image for category grids and filters.' },
    },
    {
      name: 'bannerImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Wide banner at the top of the category page (1620 × 300).' },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
        description: 'Leave blank for a top-level category.',
      },
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
