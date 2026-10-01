import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccountCard, AccountEmpty, AccountShell } from '@/components/account/AccountShell'
import { AddressCard } from '@/components/account/AddressCard'
import { ButtonLink } from '@/components/ui/button'
import { getAddresses } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'My Address', robots: { index: false, follow: false } }

/** Saved addresses (Figma 1131:11298), or the empty state (1077:26997) when there are none. */
export default async function AddressesPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/login?next=/account/addresses')

  const addresses = await getAddresses(await getPayloadClient(), customer.id)

  if (addresses.length === 0) {
    return (
      <AccountShell customer={customer} title="My Address">
        <AccountCard title="My Address" grow>
          <AccountEmpty
            image="/illustrations/empty-address.svg"
            title="Save Your Address"
            text="Add your address and make checkout faster"
            action={
              <ButtonLink href="/account/addresses/new" variant="blue" className="h-12.5 w-58">
                Add Address
              </ButtonLink>
            }
          />
        </AccountCard>
      </AccountShell>
    )
  }

  return (
    <AccountShell customer={customer} title="My Address">
      <AccountCard
        title="My Address"
        action={
          <ButtonLink
            href="/account/addresses/new"
            variant="blue"
            className="h-12.5 w-full sm:w-58"
          >
            Add New Address
          </ButtonLink>
        }
      >
        <div className="flex flex-col gap-4">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      </AccountCard>
    </AccountShell>
  )
}
