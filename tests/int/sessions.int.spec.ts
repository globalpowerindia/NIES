import { SignJWT } from 'jose'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createSessionRecord, customerForSession, revokeAllSessions, revokeSession } from '@/lib/customer-sessions'
import { signSession, verifySession } from '@/lib/session'
import config from '@/payload.config'

/**
 * A customer session is honoured only while its row is live. These assert that
 * signing out, signing out everywhere and blocking actually end a session that
 * someone may have copied, rather than just clearing one browser's cookie.
 */

let payload: Payload
const customers: number[] = []

const newCustomer = async () => {
  const customer = await payload.create({
    collection: 'customers',
    data: { email: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`, status: 'ACTIVE' },
    overrideAccess: true,
  })
  customers.push(customer.id)
  return customer.id
}

const live = (customerId: number, sessionId: number) => customerForSession(payload, { customerId, sessionId })

describe('Customer sessions', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of customers) {
      await payload.delete({ collection: 'customer-sessions', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    }
  })

  it('round-trips the session id through the signed token', async () => {
    const claims = { customerId: 41, sessionId: 97 }
    expect(await verifySession(await signSession(claims))).toEqual(claims)
  })

  it('refuses tokens from before sessions were revocable', async () => {
    const key = new TextEncoder().encode(`${process.env.PAYLOAD_SECRET}:customer-session`)
    const legacy = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('41')
      .setIssuer('powertools-storefront')
      .setAudience('customer')
      .setExpirationTime('1h')
      .sign(key)
    expect(await verifySession(legacy)).toBeNull()
  })

  it('stops honouring a session once it is signed out', async () => {
    const customerId = await newCustomer()
    const sessionId = await createSessionRecord(payload, customerId, 3600)

    expect((await live(customerId, sessionId))?.id).toBe(customerId)
    await revokeSession(payload, sessionId)
    expect(await live(customerId, sessionId)).toBeNull()
  })

  it('signing out one device leaves the others signed in', async () => {
    const customerId = await newCustomer()
    const phone = await createSessionRecord(payload, customerId, 3600)
    const laptop = await createSessionRecord(payload, customerId, 3600)

    await revokeSession(payload, phone)
    expect(await live(customerId, phone)).toBeNull()
    expect((await live(customerId, laptop))?.id).toBe(customerId)
  })

  it('signs out every device at once', async () => {
    const customerId = await newCustomer()
    const sessions = [await createSessionRecord(payload, customerId, 3600), await createSessionRecord(payload, customerId, 3600)]

    await revokeAllSessions(payload, customerId)
    for (const sessionId of sessions) expect(await live(customerId, sessionId)).toBeNull()
  })

  it('ends every session when a customer is blocked', async () => {
    const customerId = await newCustomer()
    const sessionId = await createSessionRecord(payload, customerId, 3600)

    await payload.update({ collection: 'customers', id: customerId, data: { status: 'BLOCKED' }, overrideAccess: true })
    expect(await live(customerId, sessionId)).toBeNull()
  })

  it('can still delete a customer who has sessions', async () => {
    const customerId = await newCustomer()
    await createSessionRecord(payload, customerId, 3600)

    await payload.delete({ collection: 'customers', id: customerId, overrideAccess: true })
    customers.splice(customers.indexOf(customerId), 1)
    const { totalDocs } = await payload.count({ collection: 'customer-sessions', where: { customer: { equals: customerId } }, overrideAccess: true })
    expect(totalDocs).toBe(0)
  })

  it('refuses an expired session and one presented for a different customer', async () => {
    const customerId = await newCustomer()
    const other = await newCustomer()
    const expired = await createSessionRecord(payload, customerId, -1)
    const valid = await createSessionRecord(payload, customerId, 3600)

    expect(await live(customerId, expired)).toBeNull()
    expect(await live(other, valid)).toBeNull()
  })
})
