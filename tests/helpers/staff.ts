import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { PRESET_ROLES, type Grants } from '@/access/permissions'
import type { Role } from '@/payload-types'

/** A super admin, one of the preset roles, or a role made up for the test. */
export type StaffKind = 'SUPER_ADMIN' | keyof typeof PRESET_ROLES | { grants: Grants; canEditPrices?: boolean }

const tag = () => `${Date.now()}-${randomBytes(3).toString('hex')}`

/** The preset role by name, created if the test database doesn't have it yet. */
const presetRole = async (payload: Payload, name: keyof typeof PRESET_ROLES): Promise<Role> => {
  const { docs } = await payload.find({ collection: 'roles', where: { name: { equals: name } }, limit: 1, overrideAccess: true })
  if (docs[0]) return docs[0]
  const preset = PRESET_ROLES[name]
  return payload.create({
    collection: 'roles',
    data: { name, description: preset.description, canEditPrices: preset.canEditPrices, grants: preset.grants },
    overrideAccess: true,
  })
}

type Cleanup = { collection: string; id: number }

/**
 * Creates a staff user and returns them as a request would carry them: with
 * `collection` set and the role populated, so access rules see its grants.
 * `cleanup` collects what to delete afterwards. Tests delete it in reverse,
 * so the user goes on the end and a custom role on the front: a role can't
 * be deleted while anyone holds it.
 */
export const createStaff = async <C extends Cleanup>(
  payload: Payload,
  kind: StaffKind,
  cleanup: C[],
  { isActive = true, prefix = 'staff' }: { isActive?: boolean; prefix?: string } = {},
) => {
  let role: Role | null = null
  if (typeof kind === 'object') {
    role = await payload.create({
      collection: 'roles',
      data: { name: `Test role ${tag()}`, grants: kind.grants, canEditPrices: kind.canEditPrices ?? false },
      overrideAccess: true,
    })
    cleanup.unshift({ collection: 'roles', id: role.id } as C)
  } else if (kind !== 'SUPER_ADMIN') {
    role = await presetRole(payload, kind)
  }

  const password = randomBytes(18).toString('base64url')
  const created = await payload.create({
    collection: 'users',
    data: {
      email: `${prefix}-${tag()}@example.test`,
      password,
      name: 'Test staff',
      isSuperAdmin: kind === 'SUPER_ADMIN',
      role: role?.id ?? null,
      isActive,
    },
    overrideAccess: true,
  })
  cleanup.push({ collection: 'users', id: created.id } as C)
  const user = await payload.findByID({ collection: 'users', id: created.id, depth: 1, overrideAccess: true })
  return { user: { ...user, collection: 'users' as const }, password, role }
}
