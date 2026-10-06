import type { Payload, PayloadRequest } from 'payload'

import type { Customer } from '@/payload-types'

/**
 * The server side of customer sessions: one `customer-sessions` row per
 * sign-in. Kept free of Next.js imports so collection hooks and scripts can
 * revoke sessions too.
 */

export const createSessionRecord = async (payload: Payload, customerId: number, maxAgeSeconds: number): Promise<number> => {
  const row = await payload.create({
    collection: 'customer-sessions',
    data: { customer: customerId, expiresAt: new Date(Date.now() + maxAgeSeconds * 1000).toISOString() },
    overrideAccess: true,
  })
  return row.id
}

/** The customer behind a live session, or null if it was revoked, has expired, or belongs to someone else. */
export const customerForSession = async (
  payload: Payload,
  { customerId, sessionId }: { customerId: number; sessionId: number },
): Promise<Customer | null> => {
  const { docs } = await payload.find({
    collection: 'customer-sessions',
    where: {
      and: [
        { id: { equals: sessionId } },
        { customer: { equals: customerId } },
        { revokedAt: { exists: false } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  const customer = docs[0]?.customer
  return customer && typeof customer === 'object' ? customer : null
}

export const revokeSession = async (payload: Payload, sessionId: number): Promise<void> => {
  await payload.update({
    collection: 'customer-sessions',
    where: { and: [{ id: { equals: sessionId } }, { revokedAt: { exists: false } }] },
    data: { revokedAt: new Date().toISOString() },
    overrideAccess: true,
  })
}

/** Signs a customer out on every device. */
export const revokeAllSessions = async (payload: Payload, customerId: number, req?: PayloadRequest): Promise<void> => {
  await payload.update({
    collection: 'customer-sessions',
    where: { and: [{ customer: { equals: customerId } }, { revokedAt: { exists: false } }] },
    data: { revokedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
}

/** Housekeeping for the scheduled job: rows that can no longer authenticate anyone. */
export const deleteDeadSessions = async (payload: Payload): Promise<void> => {
  const now = new Date().toISOString()
  await payload.delete({
    collection: 'customer-sessions',
    where: { or: [{ expiresAt: { less_than: now } }, { revokedAt: { exists: true } }] },
    overrideAccess: true,
  })
}
