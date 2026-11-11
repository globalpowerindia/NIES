import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccountCard, AccountShell } from '@/components/account/AccountShell'
import { ContactField } from '@/components/account/ContactField'
import { ProfileForm } from '@/components/account/ProfileForm'
import { emailDeliveryAvailable } from '@/lib/auth-email'
import { smsSender } from '@/lib/otp/sms'
import { displayPhone } from '@/lib/phone'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'My Profile', robots: { index: false, follow: false } }

/**
 * My Profile, from Figma node 1067:19004. Email and mobile are how the
 * customer signs in, so adding or changing one sends a code to the new value
 * first; each is offered only where a code can actually be delivered.
 */
export default async function ProfilePage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/login?next=/account')

  return (
    <AccountShell customer={customer} title="My Profile">
      <AccountCard title="Account Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactField
            channel="email"
            value={customer.email ?? null}
            available={emailDeliveryAvailable(await getPayloadClient())}
          />
          <ContactField
            channel="sms"
            value={customer.phone ? displayPhone(customer.phone) : null}
            available={smsSender() !== null}
          />
        </div>
      </AccountCard>

      <AccountCard title="Profile Information">
        <ProfileForm firstName={customer.firstName ?? ''} lastName={customer.lastName ?? ''} />
      </AccountCard>
    </AccountShell>
  )
}
