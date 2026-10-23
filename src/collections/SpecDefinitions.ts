import type { CollectionConfig } from 'payload'

import { allow, anyone, hiddenUnless } from '@/access/roles'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'

export const SpecDefinitions: CollectionConfig = {
  slug: 'spec-definitions',
  hooks: { afterChange: [revalidateStorefront], afterDelete: [revalidateStorefrontOnDelete] },
  labels: { singular: 'Spec Definition', plural: 'Spec Definitions' },
  admin: {
    hidden: hiddenUnless('spec-definitions'),
    useAsTitle: 'label',
    group: 'Catalog',
    defaultColumns: ['label', 'key', 'unit', 'type', 'group', 'isFilter'],
    description:
      'The registry of comparable attributes. Drives product spec tables, the compare view and catalog filters.',
    components: {
      views: { list: { Component: '/admin/views/SpecDefinitionsList#SpecDefinitionsList' } },
    },
  },
  access: {
    read: anyone,
    create: allow('spec-definitions', 'create'),
    update: allow('spec-definitions', 'update'),
    delete: allow('spec-definitions', 'delete'),
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Stable machine name, e.g. voltage, noLoadRpm, chuckSize.' },
    },
    { name: 'label', type: 'text', required: true },
    {
      name: 'unit',
      type: 'text',
      admin: { description: 'V, W, RPM, mm, kg. Leave blank for unitless values.' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'TEXT',
      options: [
        { label: 'Text', value: 'TEXT' },
        { label: 'Number', value: 'NUMBER' },
        { label: 'Boolean', value: 'BOOLEAN' },
      ],
    },
    {
      name: 'group',
      type: 'text',
      defaultValue: 'General',
      admin: { description: 'Heading this spec appears under, e.g. Motor, Physical.' },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
        description: 'Restrict this spec to one category. Leave blank to offer it everywhere.',
      },
    },
    {
      name: 'isFilter',
      type: 'checkbox',
      defaultValue: false,
      label: 'Use as a catalog filter',
      admin: { position: 'sidebar' },
    },
    {
      name: 'isSummary',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show beside the price',
      admin: {
        position: 'sidebar',
        description: 'The short "Technical Specifications" list next to Add to Cart. Keep it to about five.',
      },
    },
    {
      name: 'isCompare',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show in compare view',
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
