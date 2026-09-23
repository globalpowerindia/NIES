import type { Payload } from 'payload'

import type { AuthProvider } from '@/collections/AuthIdentities'
import type { Customer } from '@/payload-types'

/**
 * Every login path — password, OTP, Google — funnels through `resolveIdentity`.
 * It answers one question: which customer is this, and may this login method
 * be attached to them?
 *
 * The rule that matters:
 *
 *   **Never link an unverified channel to an existing customer.**
 *
 * Skipping it is the classic pre-hijack account takeover. An attacker
 * registers a password account on victim@example.com and never verifies it.
 * The victim later clicks "Sign in with Google" on their real address. If we
 * linked on the email alone, Google would drop the victim straight into the
 * attacker's account — cart, saved addresses, order history and all.
 *
 * So linking is allowed only when BOTH sides are verified:
 *  - Google links on `email_verified` from the ID token, to a customer whose
 *    `emailVerifiedAt` is set.
 *  - OTP links on a phone the customer has verified.
 *  - Password signup NEVER links. It creates its own customer and sends a
 *    verification link; the accounts merge only once that link is clicked.
 */

export type IdentityInput = {
  provider: AuthProvider
  /** Email, E.164 phone, or Google `sub`. */
  providerAccountId: string
  /** The email this login proves, if it proves one at all. */
  verifiedEmail?: string | null
  /** The phone this login proves, if it proves one at all. */
  verifiedPhone?: string | null
  /** Used only when creating a brand-new customer. */
  profile?: { firstName?: string | null; lastName?: string | null }
  /** PASSWORD only. */
  passwordHash?: string
}

export type IdentityResult =
  | { outcome: 'SIGNED_IN' | 'LINKED' | 'CREATED'; customer: Customer }
  | { outcome: 'BLOCKED'; customer: Customer }

export const normaliseEmail = (email: string): string => email.trim().toLowerCase()

/** Indian numbers are stored E.164; anything shorter is rejected upstream. */
export const normalisePhone = (phone: string): string => {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  const bare = digits.replace(/^0+/, '')
  return bare.length === 10 ? `+91${bare}` : `+${bare}`
}

const touch = async (payload: Payload, identityId: number): Promise<void> => {
  await payload.update({
    collection: 'auth-identities',
    id: identityId,
    data: { lastUsedAt: new Date().toISOString() },
    overrideAccess: true,
  })
}

const findIdentity = async (payload: Payload, provider: AuthProvider, providerAccountId: string) => {
  const { docs } = await payload.find({
    collection: 'auth-identities',
    where: {
      and: [{ provider: { equals: provider } }, { providerAccountId: { equals: providerAccountId } }],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/**
 * Finds a customer this login is allowed to attach to. Returns null unless the
 * channel is verified on BOTH sides — see the takeover note above.
 */
const findLinkTarget = async (
  payload: Payload,
  input: IdentityInput,
): Promise<Customer | null> => {
  if (input.verifiedEmail) {
    const { docs } = await payload.find({
      collection: 'customers',
      where: { email: { equals: normaliseEmail(input.verifiedEmail) } },
      limit: 1,
      overrideAccess: true,
    })
    const candidate = docs[0]
    if (candidate?.emailVerifiedAt) return candidate
  }

  if (input.verifiedPhone) {
    const { docs } = await payload.find({
      collection: 'customers',
      where: { phone: { equals: normalisePhone(input.verifiedPhone) } },
      limit: 1,
      overrideAccess: true,
    })
    const candidate = docs[0]
    if (candidate?.phoneVerifiedAt) return candidate
  }

  return null
}

/**
 * Clears an email from customers who never verified it, so a freshly verified
 * login can take it. Without this, an unverified squatter would permanently
 * block the real owner from signing in.
 */
const releaseUnverifiedEmail = async (payload: Payload, email: string): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'customers',
    where: { and: [{ email: { equals: email } }, { emailVerifiedAt: { exists: false } }] },
    pagination: false,
    overrideAccess: true,
  })
  for (const squatter of docs) {
    await payload.update({
      collection: 'customers',
      id: squatter.id,
      data: { email: null },
      overrideAccess: true,
    })
  }
}

const releaseUnverifiedPhone = async (payload: Payload, phone: string): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'customers',
    where: { and: [{ phone: { equals: phone } }, { phoneVerifiedAt: { exists: false } }] },
    pagination: false,
    overrideAccess: true,
  })
  for (const squatter of docs) {
    await payload.update({
      collection: 'customers',
      id: squatter.id,
      data: { phone: null },
      overrideAccess: true,
    })
  }
}

export const resolveIdentity = async (payload: Payload, input: IdentityInput): Promise<IdentityResult> => {
  const accountId =
    input.provider === 'PASSWORD'
      ? normaliseEmail(input.providerAccountId)
      : input.provider === 'PHONE_OTP'
        ? normalisePhone(input.providerAccountId)
        : input.providerAccountId

  // 1. Known login method: just sign them in.
  const existing = await findIdentity(payload, input.provider, accountId)
  if (existing) {
    const customer =
      typeof existing.customer === 'object'
        ? existing.customer
        : await payload.findByID({ collection: 'customers', id: existing.customer, overrideAccess: true })

    if (customer.status === 'BLOCKED') return { outcome: 'BLOCKED', customer }
    await touch(payload, existing.id)
    return { outcome: 'SIGNED_IN', customer }
  }

  // 2. New login method. Attach it to an existing customer only over a
  //    channel both sides have verified.
  const target = await findLinkTarget(payload, input)
  if (target) {
    if (target.status === 'BLOCKED') return { outcome: 'BLOCKED', customer: target }
    await payload.create({
      collection: 'auth-identities',
      data: {
        provider: input.provider,
        providerAccountId: accountId,
        customer: target.id,
        passwordHash: input.passwordHash,
        lastUsedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    return { outcome: 'LINKED', customer: target }
  }

  // 3. Nobody to link to: a new person.
  //    First, release the channel from anyone squatting it unverified. They
  //    never proved it, and the login we are handling now has. Their own
  //    login method still works; they simply lose the unproven claim.
  if (input.verifiedEmail) await releaseUnverifiedEmail(payload, normaliseEmail(input.verifiedEmail))
  if (input.verifiedPhone) await releaseUnverifiedPhone(payload, normalisePhone(input.verifiedPhone))

  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: input.verifiedEmail
        ? normaliseEmail(input.verifiedEmail)
        : input.provider === 'PASSWORD'
          ? accountId
          : undefined,
      phone: input.verifiedPhone ? normalisePhone(input.verifiedPhone) : undefined,
      // Only a channel this login actually proved counts as verified. A
      // password signup proves nothing yet.
      emailVerifiedAt: input.verifiedEmail ? new Date().toISOString() : undefined,
      phoneVerifiedAt: input.verifiedPhone ? new Date().toISOString() : undefined,
      firstName: input.profile?.firstName ?? undefined,
      lastName: input.profile?.lastName ?? undefined,
      status: 'ACTIVE',
    },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'auth-identities',
    data: {
      provider: input.provider,
      providerAccountId: accountId,
      customer: customer.id,
      passwordHash: input.passwordHash,
      lastUsedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return { outcome: 'CREATED', customer }
}
