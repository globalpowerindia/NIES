import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { keepOneSuperAdmin } from './super-admins'

/** A request whose user count says how many other active super admins exist. */
const withOthers = (others: number) => {
  const count = vi.fn(async () => ({ totalDocs: others }))
  return { req: { payload: { count } } as unknown as PayloadRequest, count }
}
const admin = { id: 1, isSuperAdmin: true, isActive: true }

describe('the last super admin', () => {
  it('cannot be demoted, disabled or deleted', async () => {
    const { req } = withOthers(0)
    await expect(keepOneSuperAdmin(req, admin, { isSuperAdmin: false })).rejects.toThrow(/only active super admin/)
    await expect(keepOneSuperAdmin(req, admin, { isActive: false })).rejects.toThrow(/only active super admin/)
    await expect(keepOneSuperAdmin(req, admin, null)).rejects.toThrow(/only active super admin/)
  })

  it('can be when another active super admin remains', async () => {
    const { req } = withOthers(1)
    await expect(keepOneSuperAdmin(req, admin, { isSuperAdmin: false })).resolves.toBeUndefined()
    await expect(keepOneSuperAdmin(req, admin, null)).resolves.toBeUndefined()
  })

  it('doesn’t even ask when the change keeps them an active super admin, or they weren’t one', async () => {
    const { req, count } = withOthers(0)
    await keepOneSuperAdmin(req, admin, { name: 'Renamed' } as object)
    await keepOneSuperAdmin(req, { id: 2, isSuperAdmin: false, isActive: true }, null)
    await keepOneSuperAdmin(req, { id: 3, isSuperAdmin: true, isActive: false }, null)
    expect(count).not.toHaveBeenCalled()
  })
})
