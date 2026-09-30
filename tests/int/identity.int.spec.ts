import { getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { attachPhone, normalisePhone, resolveIdentity } from '@/lib/identity'
import config from '@/payload.config'

/**
 * These tests are the security boundary for customer login. The linking rules
 * in `resolveIdentity` and `attachPhone` are the difference between "three
 * ways to reach one account" and "a stranger walks into someone else's order
 * history", so they are asserted rather than assumed.
 */

let payload: Payload

/** Every customer a test creates, cleaned up afterwards. */
const created = new Set<number>()

const track = <T extends { id: number }>(customer: T): T => {
  created.add(customer.id)
  return customer
}

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
const uniquePhone = () => `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
const uniqueSub = () => `google-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const byPhone = (phone: string) =>
  resolveIdentity(payload, { provider: 'PHONE_OTP', providerAccountId: phone, verifiedPhone: phone })
const byEmail = (email: string) =>
  resolveIdentity(payload, { provider: 'EMAIL_OTP', providerAccountId: email, verifiedEmail: email })
const byGoogle = (sub: string, verifiedEmail: string | null) =>
  resolveIdentity(payload, { provider: 'GOOGLE', providerAccountId: sub, verifiedEmail })

const identitiesOf = async (customerId: number) =>
  (
    await payload.find({
      collection: 'auth-identities',
      where: { customer: { equals: customerId } },
      pagination: false,
      overrideAccess: true,
    })
  ).docs

describe('resolveIdentity', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(async () => {
    for (const id of [...created]) {
      await payload.delete({ collection: 'auth-identities', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'customers', id, overrideAccess: true }).catch(() => {})
    }
    created.clear()
  })

  it('creates a customer, with the phone verified, the first time a number signs in', async () => {
    const phone = uniquePhone()
    const result = await byPhone(phone)
    track(result.customer)

    expect(result.outcome).toBe('CREATED')
    expect(result.customer.phone).toBe(phone)
    expect(result.customer.phoneVerifiedAt).toBeTruthy()
  })

  it('returns the same customer when the number signs in again', async () => {
    const phone = uniquePhone()
    const first = track((await byPhone(phone)).customer)
    const again = await byPhone(phone)

    expect(again.outcome).toBe('SIGNED_IN')
    expect(again.customer.id).toBe(first.id)
  })

  it('treats every way of writing an Indian number as one account', async () => {
    expect(normalisePhone('09876543210')).toBe('+919876543210')
    expect(normalisePhone('9876543210')).toBe('+919876543210')
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210')

    const phone = uniquePhone()
    const first = track((await byPhone(phone)).customer)
    const local = await byPhone(phone.replace('+91', '0'))
    expect(local.customer.id).toBe(first.id)
  })

  it('treats email case and surrounding space as the same account', async () => {
    const email = uniqueEmail()
    const first = track((await byEmail(email)).customer)
    const again = await byEmail(`  ${email.toUpperCase()}  `)

    expect(again.outcome).toBe('SIGNED_IN')
    expect(again.customer.id).toBe(first.id)
  })

  it('links Google to a customer who proved the same email by code', async () => {
    const email = uniqueEmail()
    const owner = track((await byEmail(email)).customer)
    const viaGoogle = await byGoogle(uniqueSub(), email)

    expect(viaGoogle.outcome).toBe('LINKED')
    expect(viaGoogle.customer.id).toBe(owner.id)
  })

  it('links an emailed code to a Google customer with that verified email', async () => {
    const email = uniqueEmail()
    const owner = track((await byGoogle(uniqueSub(), email)).customer)
    const viaCode = await byEmail(email)

    expect(viaCode.outcome).toBe('LINKED')
    expect(viaCode.customer.id).toBe(owner.id)
  })

  it('does not link Google when Google itself has not verified the email', async () => {
    const email = uniqueEmail()
    const owner = track((await byEmail(email)).customer)

    // The ID token said email_verified = false, so the callback passes null.
    const unverified = await byGoogle(uniqueSub(), null)
    track(unverified.customer)

    expect(unverified.outcome).toBe('CREATED')
    expect(unverified.customer.id).not.toBe(owner.id)
  })

  // The takeover the linking rule exists to stop.
  it('does not let anyone inherit a customer who merely has the email written down', async () => {
    const email = uniqueEmail()
    // Say staff keyed in an order for someone and typed this address; nobody
    // has proved it.
    const squatter = track(
      await payload.create({ collection: 'customers', data: { email, status: 'ACTIVE' }, overrideAccess: true }),
    )

    const realOwner = await byGoogle(uniqueSub(), email)
    track(realOwner.customer)

    // The owner neither lands in that record NOR gets locked out of their
    // address — asserting only the first would pass even if they had.
    expect(realOwner.outcome).toBe('CREATED')
    expect(realOwner.customer.id).not.toBe(squatter.id)
    expect(realOwner.customer.email).toBe(email)
    expect(realOwner.customer.emailVerifiedAt).toBeTruthy()

    const released = await payload.findByID({ collection: 'customers', id: squatter.id, overrideAccess: true })
    expect(released.email).toBeFalsy()
  })

  it('reports a blocked customer instead of signing them in', async () => {
    const phone = uniquePhone()
    const customer = track((await byPhone(phone)).customer)
    await payload.update({ collection: 'customers', id: customer.id, data: { status: 'BLOCKED' }, overrideAccess: true })

    expect((await byPhone(phone)).outcome).toBe('BLOCKED')
  })
})

describe('attachPhone (the Google follow-up step)', () => {
  beforeAll(async () => {
    payload ??= await getPayload({ config: await config })
  })

  afterEach(async () => {
    for (const id of [...created]) {
      await payload.delete({ collection: 'auth-identities', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'customers', id, overrideAccess: true }).catch(() => {})
    }
    created.clear()
  })

  it('adds a new number to the Google customer and makes it a login', async () => {
    const google = track((await byGoogle(uniqueSub(), uniqueEmail())).customer)
    const phone = uniquePhone()

    const result = await attachPhone(payload, google.id, phone)

    expect(result.outcome).toBe('ATTACHED')
    if (result.outcome === 'CONFLICT') return
    expect(result.customer.phoneVerifiedAt).toBeTruthy()
    expect((await byPhone(phone)).customer.id).toBe(google.id)
  })

  it('moves Google onto the existing phone account instead of leaving two accounts', async () => {
    const phone = uniquePhone()
    const phoneOwner = track((await byPhone(phone)).customer)
    const sub = uniqueSub()
    const shell = track((await byGoogle(sub, uniqueEmail())).customer)

    const result = await attachPhone(payload, shell.id, phone)

    expect(result.outcome).toBe('MOVED')
    if (result.outcome === 'CONFLICT') return
    expect(result.customer.id).toBe(phoneOwner.id)
    // Google now reaches the phone account, and the empty shell is gone.
    expect((await byGoogle(sub, null)).customer.id).toBe(phoneOwner.id)
    const gone = await payload.findByID({ collection: 'customers', id: shell.id, overrideAccess: true, disableErrors: true })
    expect(gone).toBeNull()
  })

  it('refuses to merge when the other account holds more than Google', async () => {
    const phone = uniquePhone()
    track((await byPhone(phone)).customer)
    const email = uniqueEmail()
    // A customer who also signs in by emailed code may have orders: never merge it silently.
    const both = track((await byEmail(email)).customer)
    await byGoogle(uniqueSub(), email)

    const result = await attachPhone(payload, both.id, phone)

    expect(result.outcome).toBe('CONFLICT')
    expect(await identitiesOf(both.id)).toHaveLength(2)
  })
})
