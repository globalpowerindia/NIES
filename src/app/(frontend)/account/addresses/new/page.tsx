import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccountCard, AccountShell } from '@/components/account/AccountShell'
import { AddressForm } from '@/components/account/AddressForm'
import { safeNext } from '@/lib/safe-redirect'
import { newAddressValues } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'

export const metadata: Metadata = { title: 'Add Address', robots: { index: false, follow: false } }

/** Figma 1127:11092, starting blank apart from the customer's own name and number. */
export default async function NewAddressPage(props: { searchParams: Promise<{ next?: string }> }) {
  const returnTo = safeNext((await props.searchParams).next, '/account/addresses')
  const customer = await getCurrentCustomer()
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/account/addresses/new?next=${returnTo}`)}`)

  return (
    <AccountShell
      customer={customer}
      title="Add Address"
      parent={{ label: 'My Address', href: '/account/addresses' }}
    >
      <AccountCard title="My Address">
        <AddressForm initial={newAddressValues(customer)} returnTo={returnTo} />
      </AccountCard>
    </AccountShell>
  )
}
