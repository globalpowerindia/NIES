import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AccountCard, AccountEmpty, AccountShell } from '@/components/account/AccountShell'
import { OrderRow } from '@/components/account/OrderRow'
import { ButtonLink } from '@/components/ui/button'
import { getOrderLines } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Orders', robots: { index: false, follow: false } }

const TABS = [
  { key: 'active', label: 'Active Orders', href: '/account/orders' },
  { key: 'past', label: 'Past Orders', href: '/account/orders?tab=past' },
] as const

/** Orders with their tracker (Figma 1131:14292), or the empty state (1080:27129). */
export default async function OrdersPage(props: PageProps<'/account/orders'>) {
  const { tab: rawTab } = await props.searchParams
  const tab = rawTab === 'past' ? 'past' : 'active'

  const customer = await getCurrentCustomer()
  if (!customer)
    redirect(`/login?next=${encodeURIComponent(TABS.find((t) => t.key === tab)!.href)}`)

  const lines = await getOrderLines(await getPayloadClient(), customer.id, tab)

  return (
    <AccountShell customer={customer} title="My Orders">
      <AccountCard title="My Orders" grow>
        <nav aria-label="Order status" className="flex">
          {TABS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === tab ? 'page' : undefined}
              className={cn(
                'px-2 py-1 text-body3',
                item.key === tab
                  ? 'border-b border-brand-blue-400 font-medium text-brand-blue-400'
                  : 'text-dark-300 hover:text-dark-500',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {lines.length === 0 ? (
          <AccountEmpty
            image="/illustrations/empty-orders.svg"
            title={tab === 'active' ? 'No Active Orders' : 'No Past Orders'}
            text={
              tab === 'active'
                ? 'No recent orders to show'
                : 'Delivered and cancelled orders will show here'
            }
            action={
              <ButtonLink href="/products" variant="blue" className="h-12.5 w-58">
                Continue Shopping
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {lines.map((line) => (
              <OrderRow key={line.key} line={line} />
            ))}
          </div>
        )}
      </AccountCard>
    </AccountShell>
  )
}
