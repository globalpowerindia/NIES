import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AccountCard, AccountShell } from '@/components/account/AccountShell'
import { AddressForm } from '@/components/account/AddressForm'
import { getAddressForEdit } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Edit Address', robots: { index: false, follow: false } }

/** Figma 1127:11092 filled in with an existing address. Someone else's id is a plain 404. */
export default async function EditAddressPage(props: PageProps<'/account/addresses/[id]'>) {
  const { id: rawId } = await props.params
  const customer = await getCurrentCustomer()
  if (!customer) redirect(`/login?next=/account/addresses/${encodeURIComponent(rawId)}`)

  const id = Number(rawId)
  const initial =
    Number.isInteger(id) && id > 0
      ? await getAddressForEdit(await getPayloadClient(), customer.id, id)
      : null
  if (!initial) notFound()

  return (
    <AccountShell
      customer={customer}
      title="Edit Address"
      parent={{ label: 'My Address', href: '/account/addresses' }}
    >
      <AccountCard title="My Address">
        <AddressForm id={id} initial={initial} />
      </AccountCard>
    </AccountShell>
  )
}
