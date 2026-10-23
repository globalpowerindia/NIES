import { APIError, type CollectionConfig, type PayloadRequest } from 'payload'

import {
  canAccessAdminUI,
  isStaff,
  isSuperAdmin,
  isSuperAdminField,
  STAFF_ROLE_OPTIONS,
} from '@/access/roles'
import { writeAudit } from '@/lib/audit'
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
      await writeAudit(req.payload, req, { action: 'PASSWORD_RESET_REQUESTED', entity: 'users', email })
      return args
    }],
    beforeLogin: [({ user }) => {
      if (user.isActive !== true) throw new APIError('Invalid credentials.', 401)
      return user
    }],
    afterLogin: [async ({ req, user }) => {
      await writeAudit(req.payload, { ...req, user: { ...user, collection: 'users' } } as PayloadRequest, {
        action: 'LOGIN',
        entity: 'users',
        documentId: user.id,
        documentTitle: user.email,
      })
    }],
    // Wrong password, unknown email, locked or disabled account: one row each, with the email tried.
    // Matched by endpoint and status, not error class: production builds minify class names.
    afterError: [async ({ error, req }) => {
      const path = new URL(req.url ?? '/', 'http://local').pathname
      if (!path.endsWith('/users/login') || !(error instanceof APIError && error.status === 401)) return
      const email = String((req.data as { email?: unknown } | undefined)?.email ?? '').toLowerCase().slice(0, 254)
      await writeAudit(req.payload, req, { action: 'LOGIN_FAILED', entity: 'users', email: email || null, changes: { reason: error.message.slice(0, 200) } }, false)
        .catch((err) => req.payload.logger.error({ err }, 'Could not record a failed staff sign-in'))
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
