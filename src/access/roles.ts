import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

import { can, canEditPrices, isSuperAdminUser, staffOf, type Action, type ResourceKey } from '@/access/permissions'

/**
 * Payload access functions built on the role grid in `permissions.ts`. Each
 * collection says which section it is and which action an operation needs;
 * the signed-in user's role decides.
 */

export const anyone: Access = () => true

/** Any active staff user, whatever their role. */
export const isStaff: Access = ({ req }) => staffOf(req.user) !== undefined
export const isSuperAdmin: Access = ({ req }) => isSuperAdminUser(req.user)
export const isSuperAdminField: FieldAccess = ({ req }) => isSuperAdminUser(req.user)
export const canAccessAdminUI = ({ req }: { req: PayloadRequest }): boolean => staffOf(req.user) !== undefined

/** This section and action, per the user's role. */
export const allow =
  (key: ResourceKey, action: Action): Access =>
  ({ req }) =>
    can(req.user, key, action)

/** For prices, GST and delivery charges; see CAPABILITIES in permissions.ts. */
export const pricesField: FieldAccess = ({ req }) => canEditPrices(req.user)

/**
 * Hides a section the storefront reads publicly from staff whose role can't
 * view it. Others are hidden by Payload itself, since their read access fails.
 */
export const hiddenUnless =
  (key: ResourceKey) =>
  ({ user }: { user: unknown }): boolean =>
    !can(user, key, 'read')

/** Public visitors see the published version; staff who may view the section see everything. */
const published =
  (key: ResourceKey, where: Where): Access =>
  ({ req }) =>
    can(req.user, key, 'read') ? true : where

export const publishedProducts = published('products', { status: { equals: 'ACTIVE' } })
export const publishedVariants = published('product-variants', {
  and: [{ isActive: { equals: true } }, { 'product.status': { equals: 'ACTIVE' } }],
})
export const publishedHome = published('home-page', { _status: { equals: 'published' } })
