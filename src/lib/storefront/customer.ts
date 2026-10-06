import { cache } from 'react'

import { customerForSession } from '@/lib/customer-sessions'
import { getSessionClaims } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'
import type { Customer } from '@/payload-types'

/**
 * The signed-in customer for server components, or null.
 *
 * The cookie only names a session; whether it is still live, and the
 * customer's status and verified channels, are read fresh every request. That
 * is the point — signing out or blocking someone takes effect on their next
 * page load instead of whenever their token happens to expire.
 */
export const getCurrentCustomer = cache(async (): Promise<Customer | null> => {
  const claims = await getSessionClaims()
  if (!claims) return null

  const customer = await customerForSession(await getPayloadClient(), claims)
  if (!customer || customer.status === 'BLOCKED') return null
  return customer
})
