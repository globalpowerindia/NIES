import type { CollectionConfig } from 'payload'

import { anyone, isManager, isSuperAdmin } from '@/access/roles'
import { slugFrom } from '@/fields/slug'
import { revalidateStorefront } from '@/lib/revalidate'
import { refreshOnBrandChange } from '@/lib/search-refresh'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    group: 'Catalog',
    defaultColumns: ['name', 'slug', 'isActive', 'sortOrder'],
    components: { views: { list: { Component: '/admin/views/BrandsList#BrandsList' } } },
  },
  access: {
    read: anyone,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: { afterChange: [revalidateStorefront, refreshOnBrandChange] },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    slugFrom('name'),
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'about', type: 'textarea' },
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
