import { NextResponse } from 'next/server'

import { getCurrentCustomer } from '@/lib/storefront/customer'

/**
 * Who is signed in, for the header's account link.
 *
 * The header asks from the browser rather than the layout reading the cookie
 * on the server: a cookie read in the layout would turn every storefront page
 * dynamic, and the homepage and listings are worth keeping static.
 */
export const GET = async (): Promise<NextResponse> => {
  const customer = await getCurrentCustomer()

  return NextResponse.json(
    {
      ok: true,
      customer: customer
        ? {
            firstName: customer.firstName ?? null,
            email: customer.email ?? null,
            phone: customer.phone ?? null,
          }
        : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
