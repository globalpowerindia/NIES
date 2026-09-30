import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccountValue } from '@/components/account/AccountField'
import { AccountCard, AccountShell } from '@/components/account/AccountShell'
import { ProfileForm } from '@/components/account/ProfileForm'
import { displayPhone } from '@/lib/phone'
import { getCurrentCustomer } from '@/lib/storefront/customer'

export const metadata: Metadata = { title: 'My Profile', robots: { index: false, follow: false } }

/**
 * My Profile, from Figma node 1067:19004. Email and mobile are shown, not
 * edited: they are how the customer signs in, so changing one needs a code
 * sent to the new address first.
 */
export default async function ProfilePage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/login?next=/account')

  return (
    <AccountShell customer={customer} title="My Profile">
      <AccountCard title="Account Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountValue label="Email Address" value={customer.email ?? null} />
          <AccountValue
            label="Mobile Number"
            value={customer.phone ? displayPhone(customer.phone) : null}
          />
        </div>
      </AccountCard>

      <AccountCard title="Profile Information">
        <ProfileForm firstName={customer.firstName ?? ''} lastName={customer.lastName ?? ''} />
      </AccountCard>
    </AccountShell>
  )
}
