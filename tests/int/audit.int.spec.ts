import { randomBytes } from 'node:crypto'

import { REST_POST } from '@payloadcms/next/routes'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Category, Product, User } from '@/payload-types'

let payload: Payload
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const tag = () => `${Date.now()}-${randomBytes(3).toString('hex')}`
const cleanup: { collection: 'users' | 'products' | 'categories'; id: number }[] = []

const staff = async (role: User['role']) => {
  const password = randomBytes(18).toString('base64url')
  const user = await payload.create({
    collection: 'users',
    data: { email: `audit-${tag()}@example.test`, password, name: 'Audit test', role, isActive: true },
    overrideAccess: true,
  })
  cleanup.push({ collection: 'users', id: user.id })
  return { user: { ...user, collection: 'users' as const }, password }
}

const entries = async (where: Record<string, unknown>) =>
  (await payload.find({ collection: 'audit-logs', where: where as never, sort: '-createdAt', overrideAccess: true, pagination: false })).docs

const login = async (email: string, password: string) =>
  REST_POST(await config)(
    new Request(`${site}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.9', 'user-agent': 'audit-test' },
      body: JSON.stringify({ email, password }),
    }),
    { params: Promise.resolve({ slug: ['users', 'login'] }) },
  )

describe('Staff audit log', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    const emails = cleanup.filter((entry) => entry.collection === 'users').length
    for (const { collection, id } of cleanup.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
    }
    if (emails) await payload.delete({ collection: 'audit-logs', where: { userEmail: { like: 'audit-' } }, overrideAccess: true })
  })

  it('records a staff price change, field by field, against the person who made it', async () => {
    const { user } = await staff('MANAGER')
    const category = await payload.create({ collection: 'categories', data: { name: `Audit ${tag()}` } as Category, overrideAccess: true })
    cleanup.push({ collection: 'categories', id: category.id })
    const product = await payload.create({
      collection: 'products',
      data: { name: `Audit drill ${tag()}`, status: 'DRAFT', category: category.id, hsnCode: '8467', gstRateBps: 1800 } as Product,
      overrideAccess: true,
    })
    cleanup.push({ collection: 'products', id: product.id })
    const variant = await payload.create({
      collection: 'product-variants',
      data: { product: product.id, sku: `AUDIT-${tag()}`, name: 'Standard', mrpPaise: 200_000, sellingPricePaise: 150_000, isActive: true },
      overrideAccess: true,
    })

    await payload.update({ collection: 'product-variants', id: variant.id, data: { sellingPricePaise: 99_000 }, user, overrideAccess: false })

    const [entry] = await entries({ and: [{ entity: { equals: 'product-variants' } }, { documentId: { equals: String(variant.id) } }] })
    expect(entry).toMatchObject({ action: 'UPDATE', userEmail: user.email, documentTitle: variant.sku })
    expect(entry.changes).toEqual({ sellingPricePaise: { from: 150_000, to: 99_000 } })
  })

  it('records nothing for system writes such as checkout or scripts', async () => {
    const category = await payload.create({ collection: 'categories', data: { name: `Audit system ${tag()}` } as Category, overrideAccess: true })
    cleanup.push({ collection: 'categories', id: category.id })
    expect(await entries({ and: [{ entity: { equals: 'categories' } }, { documentId: { equals: String(category.id) } }] })).toHaveLength(0)
  })

  it('records a password change without the password', async () => {
    const { user: admin } = await staff('SUPER_ADMIN')
    const { user: target } = await staff('STAFF')
    const secret = `New-${tag()}-Pw!`
    await payload.update({ collection: 'users', id: target.id, data: { password: secret }, user: admin, overrideAccess: false })

    const [entry] = await entries({ and: [{ entity: { equals: 'users' } }, { documentId: { equals: String(target.id) } }, { action: { equals: 'UPDATE' } }] })
    expect(entry.changes).toMatchObject({ password: { from: '(hidden)', to: '(changed)' } })
    const stored = JSON.stringify(entry.changes)
    expect(stored).not.toContain(secret)
    expect(stored).not.toMatch(/"(hash|salt)"/)
  })

  it('records staff sign-ins, successful and failed, with where they came from', async () => {
    const { user, password } = await staff('STAFF')
    expect((await login(user.email, 'wrong-password')).status).toBe(401)
    expect((await login(user.email, password)).status).toBe(200)

    const rows = await entries({ userEmail: { equals: user.email } })
    expect(rows.map((row) => row.action).sort()).toEqual(['LOGIN', 'LOGIN_FAILED'])
    expect(rows.find((row) => row.action === 'LOGIN')).toMatchObject({ ip: '203.0.113.9', userAgent: 'audit-test' })
  })

  it('can be read only by a super admin, and changed or deleted by nobody', async () => {
    const { user: manager } = await staff('MANAGER')
    const { user: admin } = await staff('SUPER_ADMIN')
    const [row] = (await payload.find({ collection: 'audit-logs', limit: 1, overrideAccess: true })).docs
    expect(row).toBeDefined()

    await expect(payload.find({ collection: 'audit-logs', user: manager, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'audit-logs', user: admin, overrideAccess: false, limit: 1 })).resolves.toHaveProperty('docs')
    await expect(payload.update({ collection: 'audit-logs', id: row.id, data: { userEmail: 'someone-else@example.test' }, user: admin, overrideAccess: false })).rejects.toThrow()
    await expect(payload.delete({ collection: 'audit-logs', id: row.id, user: admin, overrideAccess: false })).rejects.toThrow()
    await expect(payload.create({ collection: 'audit-logs', data: { action: 'LOGIN' }, user: admin, overrideAccess: false })).rejects.toThrow()
  })
})
