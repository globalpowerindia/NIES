import { getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { consumeToken, issueToken } from '@/lib/auth-tokens'
import { resolveIdentity } from '@/lib/identity'
import { hashPassword, verifyPassword } from '@/lib/password'
import config from '@/payload.config'

/**
 * One-shot links are the strongest credential the storefront hands out: a
 * password reset token is, briefly, the account. These assert the properties
 * that make them safe to email.
 */

let payload: Payload
const created: number[] = []

const uniqueEmail = () => `token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

const newCustomer = async () => {
  const result = await resolveIdentity(payload, {
    provider: 'PASSWORD',
    providerAccountId: uniqueEmail(),
    passwordHash: 'x',
  })
  created.push(result.customer.id)
  return result.customer
}

describe('auth tokens', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await payload.delete({ collection: 'auth-tokens', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'auth-identities', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'customers', id, overrideAccess: true }).catch(() => {})
    }
  })

  it('redeems a freshly issued token once', async () => {
    const customer = await newCustomer()
    const token = await issueToken(payload, 'PASSWORD_RESET', customer, customer.email!)

    const first = await consumeToken(payload, 'PASSWORD_RESET', token)
    expect(first?.customerId).toBe(customer.id)

    const second = await consumeToken(payload, 'PASSWORD_RESET', token)
    expect(second).toBeNull()
  })

  it('never stores the token itself', async () => {
    const customer = await newCustomer()
    const token = await issueToken(payload, 'EMAIL_VERIFY', customer, customer.email!)

    const { docs } = await payload.find({
      collection: 'auth-tokens',
      where: { customer: { equals: customer.id } },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].tokenHash).not.toBe(token)
    expect(docs[0].tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('will not redeem a token for a different purpose', async () => {
    const customer = await newCustomer()
    const token = await issueToken(payload, 'EMAIL_VERIFY', customer, customer.email!)

    expect(await consumeToken(payload, 'PASSWORD_RESET', token)).toBeNull()
    expect(await consumeToken(payload, 'EMAIL_VERIFY', token)).not.toBeNull()
  })

  it('kills the previous link when a new one is issued', async () => {
    const customer = await newCustomer()
    const first = await issueToken(payload, 'PASSWORD_RESET', customer, customer.email!)
    const second = await issueToken(payload, 'PASSWORD_RESET', customer, customer.email!)

    expect(first).not.toBe(second)
    expect(await consumeToken(payload, 'PASSWORD_RESET', first)).toBeNull()
    expect(await consumeToken(payload, 'PASSWORD_RESET', second)).not.toBeNull()
  })

  it('refuses an expired token', async () => {
    const customer = await newCustomer()
    const token = await issueToken(payload, 'PASSWORD_RESET', customer, customer.email!)

    const { docs } = await payload.find({
      collection: 'auth-tokens',
      where: { customer: { equals: customer.id } },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'auth-tokens',
      id: docs[0].id,
      data: { expiresAt: new Date(Date.now() - 1000).toISOString() },
      overrideAccess: true,
    })

    expect(await consumeToken(payload, 'PASSWORD_RESET', token)).toBeNull()
  })

  it('refuses nonsense', async () => {
    expect(await consumeToken(payload, 'PASSWORD_RESET', '')).toBeNull()
    expect(await consumeToken(payload, 'PASSWORD_RESET', 'not-a-real-token')).toBeNull()
  })
})

describe('passwords', () => {
  it('accepts the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(await verifyPassword('correct horse battery', hash)).toBe(true)
    expect(await verifyPassword('Correct Horse Battery', hash)).toBe(false)
  })

  it('returns false rather than throwing when there is no hash to compare', async () => {
    // The login path relies on this: an unknown address must cost the same as
    // a known one, not blow up or return early.
    expect(await verifyPassword('anything at all', null)).toBe(false)
    expect(await verifyPassword('anything at all', undefined)).toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    const a = await hashPassword('the same password')
    const b = await hashPassword('the same password')
    expect(a).not.toBe(b)
    expect(await verifyPassword('the same password', a)).toBe(true)
    expect(await verifyPassword('the same password', b)).toBe(true)
  })
})
