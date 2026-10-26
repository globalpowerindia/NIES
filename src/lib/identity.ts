import type { Payload, PayloadRequest } from 'payload'

import type { AuthProvider } from '@/collections/AuthIdentities'
import { inTransaction } from '@/lib/transaction'
import type { Customer } from '@/payload-types'

/**
 * Every login path — mobile OTP, email OTP, Google — funnels through `resolveIdentity`.
 * It answers one question: which customer is this, and may this login method
 * be attached to them?
 *
 * The rule that matters:
 *
 *   **Never link an unverified channel to an existing customer.**
 *
 * Skipping it is the classic pre-hijack account takeover: someone plants an
 * unproven claim on victim@example.com, and when the victim later signs in on
 * their real address, linking on the string alone drops them straight into
 * the attacker's account — cart, saved addresses, order history and all.
 *
 * So linking is allowed only when BOTH sides are verified:
 *  - Google links on `email_verified` from the ID token, to a customer whose
 *    `emailVerifiedAt` is set.
 *  - An emailed code proves the email, and links the same way.
 *  - A texted code proves the phone, and links to a customer whose
 *    `phoneVerifiedAt` is set.
 *
 * Every method proves its channel at sign-in, so in practice all customers are
 * verified on at least one; the rule still guards the one exception, a Google
 * account whose email Google itself has not verified.
 */

export type IdentityInput = {
  provider: AuthProvider
  /** E.164 phone, email, or Google `sub`. */
  providerAccountId: string
  /** The email this login proves, if it proves one at all. */
  verifiedEmail?: string | null
  /** The phone this login proves, if it proves one at all. */
  verifiedPhone?: string | null
  /** Used only when creating a brand-new customer. */
  profile?: { firstName?: string | null; lastName?: string | null }
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

const touch = async (payload: Payload, identityId: number, req?: PayloadRequest): Promise<void> => {
  await payload.update({
    collection: 'auth-identities',
    id: identityId,
    data: { lastUsedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
}

const findIdentity = async (payload: Payload, provider: AuthProvider, providerAccountId: string, req?: PayloadRequest) => {
  const { docs } = await payload.find({
    collection: 'auth-identities',
    where: {
      and: [{ provider: { equals: provider } }, { providerAccountId: { equals: providerAccountId } }],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
    req,
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
  req: PayloadRequest,
): Promise<Customer | null> => {
  if (input.verifiedEmail) {
    const { docs } = await payload.find({
      collection: 'customers',
      where: { email: { equals: normaliseEmail(input.verifiedEmail) } },
      limit: 1,
      overrideAccess: true,
      req,
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
      req,
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
const releaseUnverifiedEmail = async (payload: Payload, email: string, req: PayloadRequest): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'customers',
    where: { and: [{ email: { equals: email } }, { emailVerifiedAt: { exists: false } }] },
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const squatter of docs) {
    await payload.update({
      collection: 'customers',
      id: squatter.id,
      data: { email: null },
      overrideAccess: true,
      req,
    })
  }
}

const releaseUnverifiedPhone = async (payload: Payload, phone: string, req?: PayloadRequest): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'customers',
    where: { and: [{ phone: { equals: phone } }, { phoneVerifiedAt: { exists: false } }] },
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const squatter of docs) {
    await payload.update({
      collection: 'customers',
      id: squatter.id,
      data: { phone: null },
      overrideAccess: true,
      req,
    })
  }
}

/**
 * One transaction under the locks of this login method and of every channel
 * it proves (the same keys `attachPhone` takes). Two first sign-ins arriving
 * together would otherwise both find nobody and both create a customer, and
 * the second would fail on the identity's unique index, leaving an orphan.
 */
export const resolveIdentity = async (payload: Payload, input: IdentityInput): Promise<IdentityResult> => {
  const accountId =
    input.provider === 'EMAIL_OTP'
      ? normaliseEmail(input.providerAccountId)
      : input.provider === 'PHONE_OTP'
        ? normalisePhone(input.providerAccountId)
        : input.providerAccountId
  const locks = [
    `identity:${input.provider}:${accountId}`,
    ...(input.verifiedEmail ? [`identity:email:${normaliseEmail(input.verifiedEmail)}`] : []),
    ...(input.verifiedPhone ? [`identity:phone:${normalisePhone(input.verifiedPhone)}`] : []),
  ]

  return inTransaction(payload, locks, async (req): Promise<IdentityResult> => {
    // 1. Known login method: just sign them in.
    const existing = await findIdentity(payload, input.provider, accountId, req)
    if (existing) {
      const customer =
        typeof existing.customer === 'object'
          ? existing.customer
          : await payload.findByID({ collection: 'customers', id: existing.customer, overrideAccess: true, req })

      if (customer.status === 'BLOCKED') return { outcome: 'BLOCKED', customer }
      await touch(payload, existing.id, req)
      return { outcome: 'SIGNED_IN', customer }
    }

    // 2. New login method. Attach it to an existing customer only over a
    //    channel both sides have verified.
    const target = await findLinkTarget(payload, input, req)
    if (target) {
      if (target.status === 'BLOCKED') return { outcome: 'BLOCKED', customer: target }
      await payload.create({
        collection: 'auth-identities',
        data: {
          provider: input.provider,
          providerAccountId: accountId,
          customer: target.id,
          lastUsedAt: new Date().toISOString(),
        },
        overrideAccess: true,
        req,
      })
      return { outcome: 'LINKED', customer: target }
    }

    // 3. Nobody to link to: a new person.
    //    First, release the channel from anyone squatting it unverified. They
    //    never proved it, and the login we are handling now has. Their own
    //    login method still works; they simply lose the unproven claim.
    if (input.verifiedEmail) await releaseUnverifiedEmail(payload, normaliseEmail(input.verifiedEmail), req)
    if (input.verifiedPhone) await releaseUnverifiedPhone(payload, normalisePhone(input.verifiedPhone), req)

    const customer = await payload.create({
      collection: 'customers',
      data: {
        email: input.verifiedEmail ? normaliseEmail(input.verifiedEmail) : undefined,
        phone: input.verifiedPhone ? normalisePhone(input.verifiedPhone) : undefined,
        // Only a channel this login actually proved counts as verified.
        emailVerifiedAt: input.verifiedEmail ? new Date().toISOString() : undefined,
        phoneVerifiedAt: input.verifiedPhone ? new Date().toISOString() : undefined,
        firstName: input.profile?.firstName ?? undefined,
        lastName: input.profile?.lastName ?? undefined,
        status: 'ACTIVE',
      },
      overrideAccess: true,
      req,
    })

    await payload.create({
      collection: 'auth-identities',
      data: {
        provider: input.provider,
        providerAccountId: accountId,
        customer: customer.id,
        lastUsedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req,
    })

    return { outcome: 'CREATED', customer }
  })
}

export type AttachPhoneResult =
  | { outcome: 'ATTACHED' | 'MOVED'; customer: Customer }
  | { outcome: 'CONFLICT' }
  | { outcome: 'BLOCKED' }

/** Everything a customer can own besides their logins. A shell with any of it is never deleted. */
const OWNED_COLLECTIONS = ['addresses', 'orders', 'wishlist-items', 'coupon-redemptions'] as const

const ownsAnything = async (payload: Payload, customerId: number, req: PayloadRequest): Promise<boolean> => {
  for (const collection of OWNED_COLLECTIONS) {
    const { totalDocs } = await payload.count({ collection, where: { customer: { equals: customerId } }, overrideAccess: true, req })
    if (totalDocs > 0) return true
  }
  const { totalDocs: lines } = await payload.count({
    collection: 'cart-items',
    where: { 'cart.customer': { equals: customerId } },
    overrideAccess: true,
    req,
  })
  return lines > 0
}

/**
 * Adds a just-verified phone to a customer who signed in some other way —
 * Google users confirm a mobile number before their first session.
 *
 * If the phone already belongs to another customer, the person in front of us
 * has now proved they own BOTH accounts: the Google one (at the callback) and
 * the phone one (just now). The common case is someone who signed up by SMS
 * and later tapped "Continue with Google", which the linking rule above
 * correctly treated as a stranger. Their Google login then moves onto the
 * phone account and the empty shell is removed.
 *
 * The move happens only when the shell holds nothing but Google logins and
 * owns nothing else — no addresses, orders, wishlist or cart lines. That is
 * checked, not assumed: while SMS is switched off, Google-only customers do
 * get sessions and can build up data. Anything else is a conflict, never a
 * merge. The whole step runs in one transaction under the phone's and the
 * customer's locks, so it either completes or changes nothing.
 */
export const attachPhone = async (
  payload: Payload,
  customerId: number,
  rawPhone: string,
): Promise<AttachPhoneResult> => {
  const phone = normalisePhone(rawPhone)
  return inTransaction(payload, [`identity:phone:${phone}`, `customer:${customerId}`], async (req) => {
    const source = await payload.findByID({ collection: 'customers', id: customerId, overrideAccess: true, req })
    if (source.status !== 'ACTIVE') return { outcome: 'BLOCKED' }

    const owner = await findIdentity(payload, 'PHONE_OTP', phone, req)
    const ownerId = owner ? (typeof owner.customer === 'object' ? owner.customer.id : owner.customer) : null

    if (ownerId === customerId) return { outcome: 'ATTACHED', customer: source }

    if (ownerId !== null) {
      const target = await payload.findByID({ collection: 'customers', id: ownerId, overrideAccess: true, req })
      if (target.status !== 'ACTIVE') return { outcome: 'BLOCKED' }

      const { docs: shellLogins } = await payload.find({
        collection: 'auth-identities',
        where: { customer: { equals: customerId } },
        pagination: false,
        overrideAccess: true,
        req,
      })
      if (shellLogins.some((identity) => identity.provider !== 'GOOGLE')) return { outcome: 'CONFLICT' }
      if (await ownsAnything(payload, customerId, req)) return { outcome: 'CONFLICT' }

      for (const identity of shellLogins) {
        await payload.update({
          collection: 'auth-identities',
          id: identity.id,
          data: { customer: ownerId },
          overrideAccess: true,
          req,
        })
      }
      // Empty carts are the only thing a shell may still own.
      await payload.delete({ collection: 'carts', where: { customer: { equals: customerId } }, overrideAccess: true, req })
      await payload.delete({ collection: 'customers', id: customerId, overrideAccess: true, req })
      return { outcome: 'MOVED', customer: target }
    }

    await releaseUnverifiedPhone(payload, phone, req)
    const customer = await payload.update({
      collection: 'customers',
      id: customerId,
      data: { phone, phoneVerifiedAt: new Date().toISOString() },
      overrideAccess: true,
      req,
    })
    await payload.create({
      collection: 'auth-identities',
      data: {
        provider: 'PHONE_OTP',
        providerAccountId: phone,
        customer: customerId,
        lastUsedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req,
    })
    return { outcome: 'ATTACHED', customer }
  })
}
