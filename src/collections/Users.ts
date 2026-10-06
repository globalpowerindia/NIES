import { APIError, type CollectionConfig } from 'payload'

import {
  canAccessAdminUI,
  isStaff,
  isSuperAdmin,
  isSuperAdminField,
  STAFF_ROLE_OPTIONS,
} from '@/access/roles'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Settings',
    defaultColumns: ['name', 'email', 'role', 'isActive'],
    components: { views: { list: { Component: '/admin/views/UsersList#UsersList' } } },
  },
  auth: { cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' } },
  hooks: {
    // Each request emails a reset link: cap it per address and per IP.
    beforeOperation: [async ({ args, operation, req }) => {
      if (operation !== 'forgotPassword') return args
      const email = String((args as { data?: { email?: string } }).data?.email ?? '').toLowerCase()
      const ip = clientIp(req)
      for (const key of [`staff-reset:email:${email}`, `staff-reset:ip:${ip}`]) {
        const result = await rateLimit(req.payload, key, LIMITS.staffPasswordReset)
        if (!result.ok) throw new APIError('Too many reset requests. Please try again later.', 429)
      }
      return args
    }],
    beforeLogin: [({ user }) => {
      if (user.isActive !== true) throw new APIError('Invalid credentials.', 401)
      return user
    }],
    beforeChange: [({ data, originalDoc }) => {
      if (data.isActive === false || (data.role && originalDoc && data.role !== originalDoc.role)) data.sessions = []
      return data
    }],
  },
  access: {
    admin: canAccessAdminUI,
    read: isStaff,
    unlock: isSuperAdmin,
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
