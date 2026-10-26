import { APIError, type CollectionConfig } from 'payload'

import { isSuperAdminUser } from '@/access/permissions'
import { canAccessAdminUI, isStaff, isSuperAdmin, isSuperAdminField } from '@/access/roles'
import { keepOneSuperAdmin } from '@/access/super-admins'
import { writeAudit } from '@/lib/audit'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { relId } from '@/lib/relations'
import { clientIp } from '@/lib/request-ip'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Settings',
    defaultColumns: ['name', 'email', 'role', 'isSuperAdmin', 'isActive'],
    components: { views: { list: { Component: '/admin/views/UsersList#UsersList' } } },
    // Only super admins manage staff; others still see names where staff are referenced.
    hidden: ({ user }) => !isSuperAdminUser(user),
  },
  // depth 1 brings the role, with its permissions, onto req.user for every check.
  auth: { depth: 1, cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' } },
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
      await writeAudit(req.payload, req, {
        action: 'LOGIN',
        entity: 'users',
        documentId: user.id,
        documentTitle: user.email,
        staff: { id: user.id, email: user.email },
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
    beforeValidate: [async ({ data, operation, req }) => {
      // The account made on Payload's create-first-user screen is the super admin;
      // without it, the first sign-up would need a role that doesn't exist yet.
      const firstRegister = new URL(req.url ?? '/', 'http://local').pathname.endsWith('/users/first-register')
      if (operation === 'create' && data && firstRegister && (await req.payload.count({ collection: 'users', overrideAccess: true, req })).totalDocs === 0) {
        data.isSuperAdmin = true
      }
      return data
    }],
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (originalDoc) await keepOneSuperAdmin(req, originalDoc, data)
      // A change of access signs them out everywhere, so no session keeps the old rights.
      const roleChanged = 'role' in data && relId(data.role) !== relId(originalDoc?.role)
      const levelChanged = 'isSuperAdmin' in data && Boolean(data.isSuperAdmin) !== Boolean(originalDoc?.isSuperAdmin)
      if (originalDoc && (data.isActive === false || roleChanged || levelChanged)) data.sessions = []
      return data
    }],
    beforeDelete: [async ({ id, req }) => {
      const doc = await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true, req, disableErrors: true })
      if (doc) await keepOneSuperAdmin(req, doc, null)
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
      name: 'isSuperAdmin',
      label: 'Super admin',
      type: 'checkbox',
      defaultValue: false,
      access: { create: isSuperAdminField, update: isSuperAdminField },
      admin: {
        position: 'sidebar',
        description: 'Can do everything, including managing staff, roles and the audit log. Keep this to one or two people.',
      },
    },
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      index: true,
      access: { create: isSuperAdminField, update: isSuperAdminField },
      admin: {
        description: 'What they can see and do. Edit roles under Settings → Roles.',
        condition: (data) => !data?.isSuperAdmin,
      },
      validate: (value: unknown, { siblingData }: { siblingData: { isSuperAdmin?: boolean } }) =>
        siblingData?.isSuperAdmin || value ? true : 'Choose a role, or make this person a super admin.',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
