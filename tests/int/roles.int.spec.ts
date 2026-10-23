import { randomBytes } from 'node:crypto'

import { REST_DELETE, REST_GET, REST_PATCH } from '@payloadcms/next/routes'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Category, Product } from '@/payload-types'

import { createStaff, type StaffKind } from '../helpers/staff'

/**
 * Editable roles, through the REST API the admin itself uses: a role's grid
 * decides each request, a change applies at once, the price permission holds
 * at field level, and nothing past a section's ceiling can be granted.
 */

let payload: Payload
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const tag = () => `${Date.now()}-${randomBytes(3).toString('hex')}`
const cleanup: { collection: 'users' | 'roles' | 'products' | 'categories' | 'orders'; id: number }[] = []

const rest = async (method: 'GET' | 'PATCH' | 'DELETE', path: string, token: string, body?: object) => {
  const handler = { GET: REST_GET, PATCH: REST_PATCH, DELETE: REST_DELETE }[method](await config)
  const request = new Request(`${site}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handler(request, { params: Promise.resolve({ slug: path.split('?')[0].split('/') }) })
}

const signedIn = async (kind: StaffKind) => {
  const { user, password, role } = await createStaff(payload, kind, cleanup, { prefix: 'roles' })
  const { token } = await payload.login({ collection: 'users', data: { email: user.email, password } })
  return { user, role: role!, token: token! }
}

const catalogue = async () => {
  const category = await payload.create({ collection: 'categories', data: { name: `Roles ${tag()}` } as Category, overrideAccess: true })
  cleanup.push({ collection: 'categories', id: category.id })
  const product = await payload.create({
    collection: 'products',
    data: { name: `Roles drill ${tag()}`, status: 'DRAFT', category: category.id, hsnCode: '8467', gstRateBps: 1800 } as Product,
    overrideAccess: true,
  })
  cleanup.push({ collection: 'products', id: product.id })
  const variant = await payload.create({
    collection: 'product-variants',
    data: { product: product.id, sku: `ROLES-${tag()}`, name: 'Standard', mrpPaise: 200_000, sellingPricePaise: 150_000, isActive: true },
    overrideAccess: true,
  })
  return { product, variant }
}

describe('Editable staff roles', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const { collection, id } of cleanup.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('lets a role do what its grid grants and nothing else', async () => {
    const { product } = await catalogue()
    const { token } = await signedIn({ grants: { products: ['read'] } })

    const found = await rest('GET', `products/${product.id}`, token)
    expect(found.status).toBe(200)
    expect((await found.json()).status).toBe('DRAFT')
    expect((await rest('PATCH', `products/${product.id}`, token, { name: 'Renamed' })).status).toBe(403)
    expect((await rest('GET', 'orders', token)).status).toBe(403)
    expect((await rest('GET', 'roles', token)).status).toBe(403)
  })

  it('applies a super admin’s change to a role from the very next request', async () => {
    const { product } = await catalogue()
    const { token, role } = await signedIn({ grants: { products: ['read'] } })
    expect((await rest('PATCH', `products/${product.id}`, token, { subtitle: 'Before' })).status).toBe(403)

    await payload.update({ collection: 'roles', id: role.id, data: { grants: { products: ['read', 'update'] } }, overrideAccess: true })
    expect((await rest('PATCH', `products/${product.id}`, token, { subtitle: 'After' })).status).toBe(200)
    expect((await payload.findByID({ collection: 'products', id: product.id, overrideAccess: true })).subtitle).toBe('After')
  })

  it('keeps prices read-only for a role without the price permission, even where it can edit', async () => {
    const { variant } = await catalogue()
    const { token, role } = await signedIn({ grants: { 'product-variants': ['read', 'update'] }, canEditPrices: false })

    expect((await rest('PATCH', `product-variants/${variant.id}`, token, { name: 'Kit', sellingPricePaise: 100 })).status).toBe(200)
    let saved = await payload.findByID({ collection: 'product-variants', id: variant.id, overrideAccess: true })
    expect(saved.name).toBe('Kit')
    expect(saved.sellingPricePaise).toBe(150_000)

    await payload.update({ collection: 'roles', id: role.id, data: { canEditPrices: true }, overrideAccess: true })
    await rest('PATCH', `product-variants/${variant.id}`, token, { sellingPricePaise: 120_000 })
    saved = await payload.findByID({ collection: 'product-variants', id: variant.id, overrideAccess: true })
    expect(saved.sellingPricePaise).toBe(120_000)
  })

  it('stores only what a section allows, so a forged grant can’t delete an order', async () => {
    const { token, role } = await signedIn({ grants: { orders: ['read', 'delete'], 'stock-movements': ['delete'] } })
    expect((await payload.findByID({ collection: 'roles', id: role.id, overrideAccess: true })).grants).toEqual({ orders: ['read'] })

    const order = await payload.create({
      collection: 'orders',
      data: {
        orderNumber: `PT-ROLES-${tag()}`,
        status: 'CONFIRMED',
        placedAt: new Date().toISOString(),
        customerName: 'Roles test',
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
    expect((await rest('DELETE', `orders/${order.id}`, token)).status).toBe(403)
    expect((await rest('GET', `orders/${order.id}`, token)).status).toBe(200)
  })

  it('won’t delete a role while staff still hold it', async () => {
    const { role } = await signedIn({ grants: { products: ['read'] } })
    await expect(payload.delete({ collection: 'roles', id: role.id, overrideAccess: true })).rejects.toThrow(/have this role|has this role/)
  })
})
