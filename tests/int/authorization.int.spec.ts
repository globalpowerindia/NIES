import { randomBytes } from 'node:crypto'

import { REST_GET, REST_PATCH, REST_POST } from '@payloadcms/next/routes'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Category, Customer, Product } from '@/payload-types'

/**
 * Authorization through the same entry points a browser uses: the storefront
 * route handlers and pages, and Payload's REST API with a staff token. The
 * customer session itself is covered by sessions.int.spec.ts; here it is
 * simply "signed in as A", so every case is about what A may touch.
 */

const session = vi.hoisted(() => ({ customer: null as Customer | null }))
vi.mock('@/lib/storefront/customer', () => ({ getCurrentCustomer: async () => session.customer }))

const addressRoute = await import('@/app/api/account/addresses/[id]/route')
const { default: OrderComplete } = await import('@/app/(frontend)/checkout/complete/[orderNumber]/page')

let payload: Payload
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const tag = () => `${Date.now()}-${randomBytes(3).toString('hex')}`
const cleanup: { collection: 'users' | 'customers' | 'products' | 'categories' | 'orders' | 'addresses'; id: number }[] = []

const addressData = { fullName: 'Asha Menon', phone: '9876543210', line1: '12 MG Road', line2: 'Ravipuram', city: 'Kochi', pincode: '682016', stateCode: '32' as const, type: 'HOME' as const }

const storefront = (path: string, method: string, body?: object) =>
  new Request(`${site}${path}`, {
    method,
    headers: { origin: site, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

const rest = async (method: 'GET' | 'PATCH' | 'POST', path: string, token?: string, body?: object) => {
  const handler = { GET: REST_GET, PATCH: REST_PATCH, POST: REST_POST }[method](await config)
  const request = new Request(`${site}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handler(request, { params: Promise.resolve({ slug: path.split('?')[0].split('/') }) })
}

const customer = async () => {
  const doc = await payload.create({ collection: 'customers', data: { email: `authz-${tag()}@example.test`, status: 'ACTIVE' }, overrideAccess: true })
  cleanup.push({ collection: 'customers', id: doc.id })
  return doc
}

const staff = async (role: 'MANAGER' | 'STAFF') => {
  const password = randomBytes(18).toString('base64url')
  const user = await payload.create({
    collection: 'users',
    data: { email: `authz-${tag()}@example.test`, password, name: 'Authz test', role, isActive: true },
    overrideAccess: true,
  })
  cleanup.push({ collection: 'users', id: user.id })
  const { token } = await payload.login({ collection: 'users', data: { email: user.email, password } })
  return { user, token: token! }
}

describe('Authorization over HTTP', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const { collection, id } of cleanup.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
  })

  describe('one customer and another’s data', () => {
    it('cannot change or delete someone else’s address, and gets the same answer as for a missing one', async () => {
      const [a, b] = [await customer(), await customer()]
      const theirs = await payload.create({ collection: 'addresses', data: { ...addressData, phone: '+919876543210', customer: b.id }, overrideAccess: true })
      cleanup.push({ collection: 'addresses', id: theirs.id })
      session.customer = a
      const ctx = { params: Promise.resolve({ id: String(theirs.id) }) }

      const edit = await addressRoute.POST(storefront(`/api/account/addresses/${theirs.id}`, 'POST', { ...addressData, city: 'Hijacked' }), ctx)
      const remove = await addressRoute.DELETE(storefront(`/api/account/addresses/${theirs.id}`, 'DELETE'), ctx)
      const missing = await addressRoute.POST(storefront('/api/account/addresses/999999999', 'POST', addressData), { params: Promise.resolve({ id: '999999999' }) })
      expect([edit.status, remove.status]).toEqual([404, 404])
      expect(await edit.json()).toEqual(await missing.json())

      const after = await payload.findByID({ collection: 'addresses', id: theirs.id, overrideAccess: true })
      expect(after.city).toBe('Kochi')
    })

    it('can still change their own address', async () => {
      const a = await customer()
      const mine = await payload.create({ collection: 'addresses', data: { ...addressData, phone: '+919876543210', customer: a.id }, overrideAccess: true })
      cleanup.push({ collection: 'addresses', id: mine.id })
      session.customer = a
      const response = await addressRoute.POST(storefront(`/api/account/addresses/${mine.id}`, 'POST', { ...addressData, city: 'Thrissur' }), {
        params: Promise.resolve({ id: String(mine.id) }),
      })
      expect(response.status).toBe(200)
      expect((await payload.findByID({ collection: 'addresses', id: mine.id, overrideAccess: true })).city).toBe('Thrissur')
    })

    it('cannot open someone else’s order page by its number', async () => {
      const [a, b] = [await customer(), await customer()]
      const order = await payload.create({
        collection: 'orders',
        data: {
          orderNumber: `PT-AUTHZ-${tag()}`,
          status: 'CONFIRMED',
          placedAt: new Date().toISOString(),
          customer: b.id,
          customerName: 'Their name',
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
      session.customer = a
      await expect(OrderComplete({ params: Promise.resolve({ orderNumber: order.orderNumber }) })).rejects.toMatchObject({
        digest: expect.stringContaining('404'),
      })
    })

    it('gets nothing personal from the public REST API', async () => {
      for (const collection of ['customers', 'addresses', 'orders', 'carts', 'customer-sessions', 'otp-challenges', 'auth-identities', 'coupons']) {
        expect([collection, (await rest('GET', collection)).status]).toEqual([collection, 403])
      }
    })
  })

  describe('staff roles', () => {
    it('does not let STAFF make themselves an admin', async () => {
      const { user, token } = await staff('STAFF')
      const response = await rest('PATCH', `users/${user.id}`, token, { role: 'SUPER_ADMIN' })
      expect(response.status).toBe(403)
      expect((await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true })).role).toBe('STAFF')
    })

    it('does not let a MANAGER change anyone’s role', async () => {
      const { user, token } = await staff('MANAGER')
      const response = await rest('PATCH', `users/${user.id}`, token, { role: 'SUPER_ADMIN' })
      expect(response.status).toBe(403)
      expect((await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true })).role).toBe('MANAGER')
    })

    it('does not let STAFF change a price or create a coupon', async () => {
      const { token } = await staff('STAFF')
      const category = await payload.create({ collection: 'categories', data: { name: `Authz ${tag()}` } as Category, overrideAccess: true })
      cleanup.push({ collection: 'categories', id: category.id })
      const product = await payload.create({
        collection: 'products',
        data: { name: `Authz drill ${tag()}`, status: 'ACTIVE', category: category.id, hsnCode: '8467', gstRateBps: 1800 } as Product,
        overrideAccess: true,
      })
      cleanup.push({ collection: 'products', id: product.id })
      const variant = await payload.create({
        collection: 'product-variants',
        data: { product: product.id, sku: `AUTHZ-${tag()}`, name: 'Standard', mrpPaise: 200_000, sellingPricePaise: 150_000, isActive: true },
        overrideAccess: true,
      })

      expect((await rest('PATCH', `product-variants/${variant.id}`, token, { sellingPricePaise: 100 })).status).toBe(403)
      expect((await rest('PATCH', `products/${product.id}`, token, { name: 'Renamed' })).status).toBe(403)
      expect((await rest('POST', 'coupons', token, { code: `FREE${Date.now()}`, type: 'PERCENT', percentBps: 10_000 })).status).toBe(403)
      expect((await payload.findByID({ collection: 'product-variants', id: variant.id, overrideAccess: true })).sellingPricePaise).toBe(150_000)
    })
  })
})
