import type { CollectionConfig } from 'payload'

import { anyone, isManager, isStaff } from '@/access/roles'

export const Datasheets: CollectionConfig = {
  slug: 'datasheets',
  admin: { group: 'Catalog', useAsTitle: 'title' },
  access: {
    read: anyone,
    create: isStaff,
    update: isStaff,
    delete: isManager,
  },
  upload: {
    externalFileHeaderFilter: () => ({}), mimeTypes: ['application/pdf'] },
  fields: [{ name: 'title', type: 'text', required: true }],
}
