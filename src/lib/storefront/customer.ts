import { cache } from 'react'

import { getSessionCustomerId } from '@/lib/session'
import { getPayloadClient } from '@/lib/storefront/queries'
import type { Customer } from '@/payload-types'

/**
 * The signed-in customer for server components, or null.
 *
 * The cookie only carries an id; status and verified channels are read fresh
 * every request. That is the point — blocking someone takes effect on their
 * next page load instead of whenever their token happens to expire.
 */
export const getCurrentCustomer = cache(async (): Promise<Customer | null> => {
  const customerId = await getSessionCustomerId()
  if (!customerId) return null

  const payload = await getPayloadClient()
  const customer = await payload.findByID({
    collection: 'customers',
    id: customerId,
    overrideAccess: true,
    disableErrors: true,
  })

  if (!customer || customer.status === 'BLOCKED') return null
  return customer
})
