import { FileText } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AccountCard, AccountShell } from '@/components/account/AccountShell'
import { ENDED, OrderTracker, TrackingLine } from '@/components/account/OrderRow'
import { OrderSummary } from '@/components/account/OrderSummary'
import { ButtonLink } from '@/components/ui/button'
import { invoiceSeller } from '@/lib/invoice/invoice-data'
import { getCustomerOrder, orderStep } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Order details', robots: { index: false, follow: false } }

const placedOn = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

/**
 * One order: where it has got to, the courier and tracking number once it
 * ships, and what was paid. The status emails link here. Only the customer who
 * placed it can open it; an order that was never paid is still a checkout, so
 * it goes to the checkout's own page instead.
 */
export default async function OrderDetailsPage(props: PageProps<'/account/orders/[orderNumber]'>) {
  const orderNumber = decodeURIComponent((await props.params).orderNumber)
  const path = `/account/orders/${encodeURIComponent(orderNumber)}`
  const customer = await getCurrentCustomer()
  if (!customer) redirect(`/login?next=${encodeURIComponent(path)}`)

  const payload = await getPayloadClient()
  const order = await getCustomerOrder(payload, customer.id, orderNumber)
  if (!order) notFound()
  if (!order.paidAt) redirect(`/checkout/complete/${encodeURIComponent(orderNumber)}`)

  const step = orderStep(order.status)
  // Offered only once staff have filled in the seller details an invoice must carry.
  const invoiceReady =
    Boolean(order.invoiceNumber) &&
    invoiceSeller(await payload.findGlobal({ slug: 'checkout-settings', depth: 0, overrideAccess: true })) !== null

  return (
    <AccountShell customer={customer} title={`Order ${order.orderNumber}`} parent={{ label: 'My Orders', href: '/account/orders' }}>
      <AccountCard
        title={`Order ${order.orderNumber}`}
        action={
          invoiceReady ? (
            <ButtonLink
              href={`/api/account/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
              variant="outline"
              className="h-10"
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
            >
              <FileText className="size-4" aria-hidden />
              Download Invoice
            </ButtonLink>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-body3 text-dark-300 sm:text-label1">
            Placed on {placedOn.format(new Date(order.placedAt))}
            {order.invoiceNumber ? ` · Invoice ${order.invoiceNumber}` : ''}
          </p>
          {step >= 0 ? (
            <OrderTracker step={step} placedAt={order.placedAt} shippedAt={order.shippedAt ?? null} />
          ) : (
            <p className="text-label1 font-medium text-brand-red-500">{ENDED[order.status] ?? order.status}</p>
          )}
          {step >= 1 && <TrackingLine carrier={order.trackingCarrier ?? null} number={order.trackingNumber ?? null} />}
        </div>
      </AccountCard>
      <OrderSummary order={order} showTax />
    </AccountShell>
  )
}
