import { APIError, type PayloadRequest } from 'payload'

const activeSuperAdmin = (doc: { isSuperAdmin?: boolean | null; isActive?: boolean | null }) =>
  doc.isSuperAdmin === true && doc.isActive === true

/**
 * Nobody can demote, disable or delete the last active super admin: without
 * one, no one could manage staff or roles again. `next` is null for a delete.
 */
export const keepOneSuperAdmin = async (
  req: PayloadRequest,
  current: { id: number; isSuperAdmin?: boolean | null; isActive?: boolean | null },
  next: { isSuperAdmin?: boolean | null; isActive?: boolean | null } | null,
) => {
  if (!activeSuperAdmin(current)) return
  if (next && activeSuperAdmin({ isSuperAdmin: next.isSuperAdmin ?? current.isSuperAdmin, isActive: next.isActive ?? current.isActive })) return
  const others = await req.payload.count({
    collection: 'users',
    where: { and: [{ id: { not_equals: current.id } }, { isSuperAdmin: { equals: true } }, { isActive: { equals: true } }] },
    overrideAccess: true,
    req,
  })
  if (others.totalDocs === 0) {
    throw new APIError('This is the only active super admin. Make someone else a super admin first.', 400, undefined, true)
  }
}
