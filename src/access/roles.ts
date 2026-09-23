import type { Access, FieldAccess, PayloadRequest } from 'payload'

export const STAFF_ROLES = ['SUPER_ADMIN', 'MANAGER', 'STAFF'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_OPTIONS = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Staff', value: 'STAFF' },
]

const roleOf = (user: unknown): StaffRole | undefined =>
  (user as { role?: StaffRole } | null | undefined)?.role

const isManagerUser = (user: unknown): boolean => {
  const role = roleOf(user)
  return role === 'SUPER_ADMIN' || role === 'MANAGER'
}

export const anyone: Access = () => true

export const isStaff: Access = ({ req }) => Boolean(req.user)

export const isManager: Access = ({ req }) => isManagerUser(req.user)

export const isSuperAdmin: Access = ({ req }) => roleOf(req.user) === 'SUPER_ADMIN'

export const isSuperAdminField: FieldAccess = ({ req }) => roleOf(req.user) === 'SUPER_ADMIN'

export const canAccessAdminUI = ({ req }: { req: PayloadRequest }): boolean => Boolean(req.user)
