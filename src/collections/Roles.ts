import { APIError, type CollectionConfig } from 'payload'

import { CAPABILITIES, isSuperAdminUser, sanitiseGrants } from '@/access/permissions'
import { isSuperAdmin } from '@/access/roles'

/**
 * Staff roles and what each may do, edited only by super admins; see
 * src/access/permissions.ts. A change applies from the holder's next click:
 * the role is read with the user on every request.
 */
export const Roles: CollectionConfig = {
  slug: 'roles',
  labels: { singular: 'Role', plural: 'Roles' },
  admin: {
    useAsTitle: 'name',
    group: 'Settings',
    defaultColumns: ['name', 'description', 'updatedAt'],
    description: 'What each kind of staff user can see and do. Super admins can always do everything.',
    hidden: ({ user }) => !isSuperAdminUser(user),
  },
  access: {
    read: isSuperAdmin,
    create: isSuperAdmin,
    update: isSuperAdmin,
    delete: isSuperAdmin,
  },
  hooks: {
    // Whatever arrives, only grants the ceiling allows are stored.
    beforeValidate: [
      ({ data }) => {
        if (data && 'grants' in data) data.grants = sanitiseGrants(data.grants)
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({ collection: 'users', where: { role: { equals: id } }, overrideAccess: true, req })
        if (totalDocs) {
          throw new APIError(`${totalDocs} staff ${totalDocs === 1 ? 'user has' : 'users have'} this role. Give them another role first.`, 400, undefined, true)
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea', admin: { description: 'What this role is for, for whoever assigns it.' } },
    {
      name: 'grants',
      label: 'Permissions',
      type: 'json',
      defaultValue: {},
      admin: { components: { Field: '/admin/components/PermissionGrid#PermissionGrid' } },
    },
    {
      name: 'canEditPrices',
      label: CAPABILITIES.canEditPrices.label,
      type: 'checkbox',
      defaultValue: false,
      admin: { description: CAPABILITIES.canEditPrices.description },
    },
    { name: 'members', label: 'Staff with this role', type: 'join', collection: 'users', on: 'role' },
  ],
}
