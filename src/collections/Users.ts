import type { CollectionConfig } from 'payload'

import {
  canAccessAdminUI,
  isStaff,
  isSuperAdmin,
  isSuperAdminField,
  STAFF_ROLE_OPTIONS,
} from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Settings',
    defaultColumns: ['name', 'email', 'role', 'isActive'],
    components: { views: { list: { Component: '/admin/views/UsersList#UsersList' } } },
  },
  auth: true,
  access: {
    admin: canAccessAdminUI,
    read: isStaff,
    create: isSuperAdmin,
    update: isSuperAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'STAFF',
      saveToJWT: true,
      options: STAFF_ROLE_OPTIONS,
      access: { update: isSuperAdminField },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
