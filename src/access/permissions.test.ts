import { describe, expect, it } from 'vitest'

import { can, canEditPrices, isSuperAdminUser, PRESET_ROLES, RESOURCES, sanitiseGrants } from './permissions'

const staff = (role: object | number | null, extra: object = {}) => ({ collection: 'users', isActive: true, role, ...extra })
const superAdmin = { collection: 'users', isActive: true, isSuperAdmin: true, role: null }

describe('staff permissions', () => {
  it('lets a role do exactly what it grants, section by section', () => {
    const user = staff({ grants: { orders: ['read', 'update'], products: ['read'] } })
    expect(can(user, 'orders', 'read')).toBe(true)
    expect(can(user, 'orders', 'update')).toBe(true)
    expect(can(user, 'orders', 'create')).toBe(false)
    expect(can(user, 'products', 'update')).toBe(false)
    expect(can(user, 'coupons', 'read')).toBe(false)
  })

  it('never lets a role past a section’s ceiling, even with a forged grant', () => {
    const user = staff({ grants: { orders: ['read', 'delete'], 'stock-movements': ['update', 'delete'] } })
    expect(can(user, 'orders', 'delete')).toBe(false)
    expect(can(user, 'stock-movements', 'update')).toBe(false)
  })

  it('lets a super admin do anything, including what no role can be granted', () => {
    expect(can(superAdmin, 'orders', 'delete')).toBe(true)
    expect(isSuperAdminUser(superAdmin)).toBe(true)
    expect(canEditPrices(superAdmin)).toBe(true)
  })

  it('grants nothing to disabled staff, customers, guests, or a role that wasn’t loaded', () => {
    const grants = { orders: ['read'] }
    expect(can(staff({ grants }, { isActive: false }), 'orders', 'read')).toBe(false)
    expect(can({ ...superAdmin, isActive: false }, 'orders', 'read')).toBe(false)
    expect(can({ collection: 'customers', isActive: true, role: { grants } }, 'orders', 'read')).toBe(false)
    expect(can(null, 'orders', 'read')).toBe(false)
    expect(can(staff(4), 'orders', 'read')).toBe(false)
  })

  it('needs the role’s price permission to change prices', () => {
    expect(canEditPrices(staff({ grants: {}, canEditPrices: true }))).toBe(true)
    expect(canEditPrices(staff({ grants: { 'product-variants': ['read', 'update'] }, canEditPrices: false }))).toBe(false)
  })
})

describe('stored grants', () => {
  it('keeps only actions a section allows, and adds View to any other action', () => {
    expect(sanitiseGrants({ orders: ['update', 'delete'], carts: ['create'], nonsense: ['read'], coupons: 'all' })).toEqual({
      orders: ['read', 'update'],
    })
  })

  it('handles sections that are edited but never "viewed" through the grid', () => {
    expect(sanitiseGrants({ 'site-settings': ['update'] })).toEqual({ 'site-settings': ['update'] })
  })

  it('describes every section in the presets with valid grants', () => {
    const keys = new Set<string>(RESOURCES.map((resource) => resource.key))
    for (const preset of Object.values(PRESET_ROLES)) {
      for (const key of Object.keys(preset.grants)) expect(keys.has(key)).toBe(true)
      expect(sanitiseGrants(preset.grants)).toEqual(preset.grants)
    }
  })
})
