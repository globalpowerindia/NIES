import { CircleCheck, Clock, CircleX } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { RefreshWhilePending } from '@/components/checkout/RefreshWhilePending'
import { ButtonLink } from '@/components/ui/button'
import { formatCurrency } from '@/lib/money'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Order', robots: { index: false, follow: false } }

const money = (paise: number | null | undefined) => formatCurrency(paise ?? 0, { showPaise: true })

/** Where checkout lands after payment, and the link in the confirmation email. Only the customer who placed it can open it. */
export default async function OrderComplete(props: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await props.params
  const customer = await getCurrentCustomer()
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/checkout/complete/${orderNumber}`)}`)

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ orderNumber: { equals: decodeURIComponent(orderNumber) } }, { customer: { equals: customer.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const order = docs[0]
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
          <h1 className="text-h4 font-semibold text-dark-500">{title}</h1>
          <p role={pending ? 'status' : undefined} className="max-w-[35rem] text-label1 text-dark-300">
            {text}
          </p>
          <p className="text-body1 text-dark-500">
            Order <span className="font-semibold">{order.orderNumber}</span>
            {order.invoiceNumber ? ` · Invoice ${order.invoiceNumber}` : ''}
          </p>
        </section>

        <section className="grid gap-6 rounded-lg bg-light-100 p-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className="text-h6 font-semibold text-dark-500">Items</h2>
            <ul className="flex flex-col gap-2">
              {(order.items ?? []).map((item) => (
                <li key={item.id ?? item.sku} className="flex justify-between gap-4 text-body1 text-dark-500">
                  <span>
                    {item.quantity} × {item.productName}
                  </span>
                  <span className="whitespace-nowrap">{money(item.lineNetPaise)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 flex flex-col gap-1 border-t-[0.5px] border-dark-100 pt-3 text-body1 text-dark-400">
              {order.discountPaise ? (
                <div className="flex justify-between">
                  <dt>Coupon{order.couponCode ? ` ${order.couponCode}` : ''}</dt>
                  <dd>− {money(order.discountPaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd>
                  {order.shippingPaise
                    ? money(order.shippingPaise)
                    : order.deliveryDiscountPaise
                      ? `Free with ${order.couponCode ?? 'coupon'}`
                      : 'Free'}
                </dd>
              </div>
              <div className="flex justify-between text-h6 font-semibold text-dark-500">
                <dt>{paid ? 'Total paid' : 'Total'}</dt>
                <dd>{money(order.grandTotalPaise)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-h6 font-semibold text-dark-500">Delivering to</h2>
            <p className="text-body1 text-dark-400">
              {order.customerName}
              <br />
              {order.shipLine1}
              {order.shipLine2 ? (
                <>
                  <br />
                  {order.shipLine2}
                </>
              ) : null}
              <br />
              {order.shipCity}, {order.shipStateName} - {order.shipPincode}
              <br />
              {order.customerPhone}
            </p>
          </div>
        </section>

        <div className="flex flex-wrap justify-center gap-4">
          <ButtonLink href="/account/orders" variant="blue" className="h-12.5 w-58">
            My Orders
          </ButtonLink>
          <ButtonLink href={paid ? '/products' : '/cart'} variant="outline" className="h-12.5 w-58">
            {paid ? 'Continue Shopping' : 'Back to Cart'}
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}
