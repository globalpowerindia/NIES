import { randomBytes } from 'node:crypto'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

/**
 * The access rules that the generated REST/GraphQL API enforces. Each case
 * runs with `overrideAccess: false`, which is what an HTTP request gets.
 */

let payload: Payload
const cleanup: { collection: 'users' | 'customers' | 'products' | 'categories' | 'orders'; id: number }[] = []

const tag = () => `${Date.now()}-${randomBytes(3).toString('hex')}`

const staff = async (role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF', isActive: boolean) => {
  const password = randomBytes(18).toString('base64url')
  const user = await payload.create({
    collection: 'users',
    data: { email: `access-${tag()}@example.test`, password, name: 'Access test', role, isActive },
    overrideAccess: true,
  })
  cleanup.push({ collection: 'users', id: user.id })
  return { user: { ...user, collection: 'users' as const }, password }
}

describe('Access rules', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const { collection, id } of cleanup.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('refuses login to disabled staff', async () => {
    const { user, password } = await staff('SUPER_ADMIN', false)
    await expect(payload.login({ collection: 'users', data: { email: user.email, password } })).rejects.toThrow()
  })

  it('gives a disabled super admin no access with an existing session', async () => {
    const { user } = await staff('SUPER_ADMIN', false)
    await expect(payload.find({ collection: 'customers', user, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'users', user, overrideAccess: false })).rejects.toThrow()
  })

  it('still lets active staff in', async () => {
    const { user, password } = await staff('MANAGER', true)
    await expect(payload.login({ collection: 'users', data: { email: user.email, password } })).resolves.toHaveProperty('token')
    await expect(payload.find({ collection: 'customers', user, overrideAccess: false, limit: 1 })).resolves.toHaveProperty('docs')
  })

  it('does not let a manager set verified contact details on a customer', async () => {
    const { user } = await staff('MANAGER', true)
    const email = `customer-${tag()}@example.test`
    const customer = await payload.create({ collection: 'customers', data: { email, firstName: 'Before', status: 'ACTIVE' }, overrideAccess: true })
    cleanup.push({ collection: 'customers', id: customer.id })

    const updated = await payload.update({
      collection: 'customers',
      id: customer.id,
      data: { firstName: 'After', email: 'attacker@example.test', emailVerifiedAt: new Date().toISOString() },
      user,
      overrideAccess: false,
    })

    expect(updated.firstName).toBe('After')
    expect(updated.email).toBe(email)
    expect(updated.emailVerifiedAt ?? null).toBeNull()
  })

  it('hides draft products from the public API but not from staff', async () => {
    const name = `Access ${tag()}`
    const category = await payload.create({ collection: 'categories', data: { name, slug: name.toLowerCase().replace(/\W+/g, '-') }, overrideAccess: true })
    cleanup.push({ collection: 'categories', id: category.id })
    const draft = await payload.create({
      collection: 'products',
      data: { name: `Draft ${name}`, slug: `draft-${category.slug}`, status: 'DRAFT', category: category.id, hsnCode: '8467', gstRateBps: 1800 },
      overrideAccess: true,
    })
    cleanup.push({ collection: 'products', id: draft.id })
    const where = { id: { equals: draft.id } }

    const anonymous = await payload.find({ collection: 'products', where, overrideAccess: false })
    expect(anonymous.docs).toHaveLength(0)

    const { user } = await staff('STAFF', true)
    const asStaff = await payload.find({ collection: 'products', where, user, overrideAccess: false })
    expect(asStaff.docs).toHaveLength(1)
  })

  it('holds every staff write to the order status rules and fixed totals', async () => {
    const { user } = await staff('MANAGER', true)
    const order = await payload.create({
      collection: 'orders',
      data: {
        orderNumber: `PT-TEST-${tag()}`,
        status: 'CONFIRMED',
        placedAt: new Date().toISOString(),
        customerName: 'Access test',
        shipLine1: '1 MG Road',
        shipCity: 'Kochi',
        shipPincode: '682001',
        shipStateCode: '32',
        shipStateName: 'Kerala',
        subtotalPaise: 100000,
        taxablePaise: 84746,
        grandTotalPaise: 100000,
      },
      overrideAccess: true,
    })
    cleanup.push({ collection: 'orders', id: order.id })
    const patch = (data: Record<string, unknown>) =>
      payload.update({ collection: 'orders', id: order.id, data, user, overrideAccess: false })

    await expect(patch({ status: 'DELIVERED' })).rejects.toThrow()
    await expect(patch({ status: 'PENDING_PAYMENT' })).rejects.toThrow()

    const packed = await patch({ status: 'PACKED', grandTotalPaise: 1, trackingNumber: 'ABC123' })
    expect(packed.status).toBe('PACKED')
    expect(packed.grandTotalPaise).toBe(100000)
    expect(packed.trackingNumber).toBe('ABC123')
  })
})
