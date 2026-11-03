import { CircleCheck, Clock, CircleX } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { OrderSummary } from '@/components/account/OrderSummary'
import { RefreshWhilePending } from '@/components/checkout/RefreshWhilePending'
import { ButtonLink } from '@/components/ui/button'
import { getCustomerOrder } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Order', robots: { index: false, follow: false } }

/** Where checkout lands after payment. Only the customer who placed it can open it. */
export default async function OrderComplete(props: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await props.params
  const customer = await getCurrentCustomer()
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/checkout/complete/${orderNumber}`)}`)

  const order = await getCustomerOrder(await getPayloadClient(), customer.id, decodeURIComponent(orderNumber))
  if (!order) notFound()

  const paid = Boolean(order.paidAt)
  const pending = order.status === 'PENDING_PAYMENT'
  const { icon: Icon, tone, title, text } = paid
    ? {
        icon: CircleCheck,
        tone: 'text-green-400',
        title: 'Thank you for your order',
        text: order.customerEmail
          ? `We’ve received your payment and sent a confirmation to ${order.customerEmail}.`
          : 'We’ve received your payment.',
      }
    : pending
      ? {
          icon: Clock,
          tone: 'text-brand-blue-500',
          title: 'Confirming your payment',
          text: 'This usually takes a few seconds. This page updates by itself.',
        }
      : {
          icon: CircleX,
          tone: 'text-brand-red-500',
          title: 'Payment not completed',
          text: 'This order was not paid, so it has been cancelled. Any amount debited is refunded automatically by your bank within 5–7 days.',
        }

  return (
    <main className="bg-light-400 pb-6">
      {pending && <RefreshWhilePending />}
      <div className="container-page flex flex-col gap-6 pt-6">
        <section className="flex flex-col items-center gap-3 rounded-lg bg-light-100 px-5 py-10 text-center">
          <Icon className={`size-14 ${tone}`} strokeWidth={1.5} aria-hidden />
          <h1 className="text-h5 font-semibold text-dark-500 sm:text-h4">{title}</h1>
          <p role={pending ? 'status' : undefined} className="max-w-[35rem] text-body3 text-dark-300 sm:text-label1">
            {text}
          </p>
          <p className="text-body3 text-dark-500 sm:text-body1">
            Order <span className="font-semibold">{order.orderNumber}</span>
            {order.invoiceNumber ? ` · Invoice ${order.invoiceNumber}` : ''}
          </p>
        </section>

        <OrderSummary order={order} />

        <div className="flex flex-wrap justify-center gap-4">
          <ButtonLink
            href={paid ? `/account/orders/${encodeURIComponent(order.orderNumber)}` : '/account/orders'}
            variant="blue"
            className="h-12.5 w-58"
          >
            {paid ? 'Track Order' : 'My Orders'}
          </ButtonLink>
          <ButtonLink href={paid ? '/products' : '/cart'} variant="outline" className="h-12.5 w-58">
            {paid ? 'Continue Shopping' : 'Back to Cart'}
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}
