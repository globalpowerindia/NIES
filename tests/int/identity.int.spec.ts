import { getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { normalisePhone, resolveIdentity } from '@/lib/identity'
import config from '@/payload.config'

/**
 * These tests are the security boundary for customer login. The linking rules
 * in `resolveIdentity` are the difference between "three ways to reach one
 * account" and "a stranger walks into someone else's order history", so they
 * are asserted rather than assumed.
 */

let payload: Payload

/** Everything created by a test, cleaned up afterwards. */
const created: number[] = []

const track = <T extends { id: number }>(customer: T): T => {
  created.push(customer.id)
  return customer
}

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
const uniquePhone = () => `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`

const verifyEmail = (id: number) =>
  payload.update({
    collection: 'customers',
    id,
    data: { emailVerifiedAt: new Date().toISOString() },
    overrideAccess: true,
  })

describe('resolveIdentity', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await payload.delete({ collection: 'auth-identities', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'customers', id, overrideAccess: true }).catch(() => {})
    }
  })

  it('creates a customer the first time a login method is seen', async () => {
    const email = uniqueEmail()
    const result = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'x',
    })

    expect(result.outcome).toBe('CREATED')
    track(result.customer)
    expect(result.customer.email).toBe(email)
  })

  it('returns the same customer when that login method is seen again', async () => {
    const email = uniqueEmail()
    const first = await resolveIdentity(payload, { provider: 'PASSWORD', providerAccountId: email, passwordHash: 'x' })
    track(first.customer)

    const second = await resolveIdentity(payload, { provider: 'PASSWORD', providerAccountId: email, passwordHash: 'x' })

    expect(second.outcome).toBe('SIGNED_IN')
    expect(second.customer.id).toBe(first.customer.id)
  })

  it('treats email case and surrounding space as the same account', async () => {
    const email = uniqueEmail()
    const first = await resolveIdentity(payload, { provider: 'PASSWORD', providerAccountId: email, passwordHash: 'x' })
    track(first.customer)

    const again = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: `  ${email.toUpperCase()}  `,
      passwordHash: 'x',
    })

    expect(again.outcome).toBe('SIGNED_IN')
    expect(again.customer.id).toBe(first.customer.id)
  })

  // The whole point of the module.
  it('does NOT let Google land inside an unverified password account', async () => {
    const email = uniqueEmail()

    // The attacker registers a password account on the victim's email and
    // never verifies it.
    const attacker = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'attacker',
    })
    track(attacker.customer)
    expect(attacker.customer.emailVerifiedAt).toBeFalsy()

    // The victim signs in with Google on their real address.
    const victim = await resolveIdentity(payload, {
      provider: 'GOOGLE',
      providerAccountId: 'google-sub-victim',
      verifiedEmail: email,
    })
    track(victim.customer)

    // Two things must both hold: the victim does not land in the attacker's
    // account, AND the victim can still sign in. Asserting only the first
    // would pass even if the attacker had locked that email out entirely.
    expect(victim.outcome).toBe('CREATED')
    expect(victim.customer.id).not.toBe(attacker.customer.id)
    expect(victim.customer.emailVerifiedAt).toBeTruthy()
    expect(victim.customer.email).toBe(email)

    // The squatter keeps their login, but loses the unproven claim.
    const squatter = await payload.findByID({
      collection: 'customers',
      id: attacker.customer.id,
      overrideAccess: true,
    })
    expect(squatter.email).toBeFalsy()

    const attackerAgain = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'attacker',
    })
    expect(attackerAgain.outcome).toBe('SIGNED_IN')
    expect(attackerAgain.customer.id).toBe(attacker.customer.id)
  })

  it('does link Google to a password account whose email IS verified', async () => {
    const email = uniqueEmail()
    const owner = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'owner',
    })
    track(owner.customer)
    await verifyEmail(owner.customer.id)

    const viaGoogle = await resolveIdentity(payload, {
      provider: 'GOOGLE',
      providerAccountId: `google-sub-${owner.customer.id}`,
      verifiedEmail: email,
    })

    expect(viaGoogle.outcome).toBe('LINKED')
    expect(viaGoogle.customer.id).toBe(owner.customer.id)
  })

  it('does not link Google when Google itself has not verified the email', async () => {
    const email = uniqueEmail()
    const owner = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'owner',
    })
    track(owner.customer)
    await verifyEmail(owner.customer.id)

    // No `verifiedEmail`: the ID token said email_verified = false.
    const unverified = await resolveIdentity(payload, {
      provider: 'GOOGLE',
      providerAccountId: 'google-sub-unverified',
      verifiedEmail: null,
    })
    track(unverified.customer)

    expect(unverified.outcome).toBe('CREATED')
    expect(unverified.customer.id).not.toBe(owner.customer.id)
  })

  it('links a phone OTP to a customer who has verified that phone', async () => {
    const phone = uniquePhone()
    const first = await resolveIdentity(payload, {
      provider: 'PHONE_OTP',
      providerAccountId: phone,
      verifiedPhone: phone,
    })
    track(first.customer)
    expect(first.customer.phoneVerifiedAt).toBeTruthy()

    const again = await resolveIdentity(payload, {
      provider: 'PHONE_OTP',
      providerAccountId: phone,
      verifiedPhone: phone,
    })
    expect(again.outcome).toBe('SIGNED_IN')
    expect(again.customer.id).toBe(first.customer.id)
  })

  it('normalises Indian phone numbers to one E.164 account', async () => {
    expect(normalisePhone('09876543210')).toBe('+919876543210')
    expect(normalisePhone('9876543210')).toBe('+919876543210')
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210')
  })

  it('reports a blocked customer instead of signing them in', async () => {
    const email = uniqueEmail()
    const customer = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'x',
    })
    track(customer.customer)
    await payload.update({
      collection: 'customers',
      id: customer.customer.id,
      data: { status: 'BLOCKED' },
      overrideAccess: true,
    })

    const attempt = await resolveIdentity(payload, {
      provider: 'PASSWORD',
      providerAccountId: email,
      passwordHash: 'x',
    })
    expect(attempt.outcome).toBe('BLOCKED')
  })
})
