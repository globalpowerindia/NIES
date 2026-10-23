import type { CollectionConfig } from 'payload'

import { activeStaffRole, isSuperAdmin } from '@/access/roles'
import { AUDIT_ACTIONS } from '@/lib/audit'

/**
 * The staff audit trail; see `src/lib/audit.ts`. Append-only: rows are written
 * by hooks through the Local API, and no one, a Super Admin included, can edit
 * or delete one through the admin or the API.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit log entry', plural: 'Audit log' },
  admin: {
    group: 'Settings',
    useAsTitle: 'documentTitle',
    defaultColumns: ['createdAt', 'userEmail', 'action', 'entity', 'documentTitle', 'ip'],
    description: 'Every change staff make in the admin, and every staff sign-in. Read-only.',
    hidden: ({ user }) => activeStaffRole(user) !== 'SUPER_ADMIN',
  },
  access: {
    read: isSuperAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          index: true,
          options: AUDIT_ACTIONS.map((value) => ({ label: value.replace(/_/g, ' ').toLowerCase(), value })),
          admin: { width: '30%' },
        },
        { name: 'user', type: 'relationship', relationTo: 'users', index: true, admin: { width: '35%' } },
        {
          name: 'userEmail',
          label: 'Email',
          type: 'text',
          index: true,
          admin: { width: '35%', description: 'Kept even if the staff account is later deleted.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'entity', label: 'Collection', type: 'text', index: true, admin: { width: '30%' } },
        { name: 'documentId', label: 'Document id', type: 'text', index: true, admin: { width: '20%' } },
        { name: 'documentTitle', label: 'Document', type: 'text', admin: { width: '50%' } },
      ],
    },
    { name: 'changes', type: 'json', admin: { description: 'Each changed field, before and after. Secrets are never recorded.' } },
    {
      type: 'row',
      fields: [
        { name: 'ip', label: 'IP address', type: 'text', admin: { width: '30%' } },
        { name: 'userAgent', label: 'Browser', type: 'text', admin: { width: '70%' } },
      ],
    },
  ],
}
