import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export const STAFF_ROLES = ['SUPER_ADMIN', 'MANAGER', 'STAFF'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_OPTIONS = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Staff', value: 'STAFF' },
]

export const activeStaffRole = (user: unknown): StaffRole | undefined => {
  if (!user || typeof user !== 'object') return undefined
  const staff = user as { collection?: string; isActive?: boolean; role?: StaffRole }
  if (staff.collection !== 'users' || staff.isActive !== true) return undefined
  return STAFF_ROLES.includes(staff.role as StaffRole) ? staff.role : undefined
}

export const anyone: Access = () => true
export const isStaff: Access = ({ req }) => activeStaffRole(req.user) !== undefined
export const isManager: Access = ({ req }) => ['SUPER_ADMIN', 'MANAGER'].includes(activeStaffRole(req.user) ?? '')
export const isSuperAdmin: Access = ({ req }) => activeStaffRole(req.user) === 'SUPER_ADMIN'
export const isSuperAdminField: FieldAccess = ({ req }) => activeStaffRole(req.user) === 'SUPER_ADMIN'
export const canAccessAdminUI = ({ req }: { req: PayloadRequest }): boolean => activeStaffRole(req.user) !== undefined
export const publishedProducts: Access = ({ req }) => activeStaffRole(req.user) ? true : { status: { equals: 'ACTIVE' } }
const PUBLISHED_VARIANT: Where = {
  and: [{ isActive: { equals: true } }, { 'product.status': { equals: 'ACTIVE' } }],
}
export const publishedVariants: Access = ({ req }) => activeStaffRole(req.user) ? true : PUBLISHED_VARIANT
export const publishedHome: Access = ({ req }) => activeStaffRole(req.user) ? true : { _status: { equals: 'published' } }
