import type { Payload, Where } from 'payload'

import { normaliseEmail } from '@/lib/identity'
import { mergeGuestCart } from '@/lib/storefront/cart'
import type { Customer } from '@/payload-types'

/**
 * Attaches orders placed as a guest to the customer who just signed in, but
 * only through a channel they have proved: a verified email claims orders
 * placed with that email, a verified phone those placed with that phone.
 * Typing someone else's number at checkout must never hand over their order
 * history, so an unverified channel claims nothing.
 */
export const claimGuestOrders = async (payload: Payload, customer: Customer): Promise<number> => {
  const channels: Where[] = [
    ...(customer.email && customer.emailVerifiedAt
      ? [{ customerEmail: { equals: normaliseEmail(customer.email) } }]
      : []),
    ...(customer.phone && customer.phoneVerifiedAt
      ? [{ customerPhone: { equals: customer.phone } }]
      : []),
  ]
  if (channels.length === 0) return 0

  const result = await payload.update({
    collection: 'orders',
    where: { and: [{ customer: { exists: false } }, { or: channels }] },
    data: { customer: customer.id },
    depth: 0,
    overrideAccess: true,
  })
  return result.docs.length
}

/**
 * Runs once a session has been issued: brings this browser's guest cart into
 * the account and claims the customer's guest orders. Neither may stop a
 * sign-in that has already succeeded, so failures are logged and swallowed.
 */
export const afterSignIn = async (payload: Payload, customer: Customer): Promise<void> => {
  try {
    await mergeGuestCart(payload, customer.id)
  } catch (error) {
    payload.logger.error(
      { err: error, customerId: customer.id },
      'Could not merge the guest cart on sign-in',
    )
  }
  try {
    await claimGuestOrders(payload, customer)
  } catch (error) {
    payload.logger.error(
      { err: error, customerId: customer.id },
      'Could not claim guest orders on sign-in',
    )
  }
}
