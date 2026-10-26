import type { CollectionConfig } from 'payload'

import { allow, anyone, hiddenUnless } from '@/access/roles'

export const Datasheets: CollectionConfig = {
  slug: 'datasheets',
  admin: { hidden: hiddenUnless('datasheets'), group: 'Catalog', useAsTitle: 'title' },
  access: {
    read: anyone,
    create: allow('datasheets', 'create'),
    update: allow('datasheets', 'update'),
    delete: allow('datasheets', 'delete'),
  },
  upload: {
    externalFileHeaderFilter: () => ({}), mimeTypes: ['application/pdf'] },
  fields: [{ name: 'title', type: 'text', required: true }],
}
