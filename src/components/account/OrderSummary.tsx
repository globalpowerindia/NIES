import { formatCurrency } from '@/lib/money'
import type { Order } from '@/payload-types'

const money = (paise: number | null | undefined) => formatCurrency(paise ?? 0, { showPaise: true })

/**
 * What was ordered, what it cost and where it's going: the order-complete
 * page and the account's order page show the same summary. Prices include
 * GST; `showTax` lists the tax inside them, as the invoice will.
 */
export const OrderSummary = ({ order, showTax = false }: { order: Order; showTax?: boolean }) => {
  const paid = Boolean(order.paidAt)
  const taxes = [
    ['CGST', order.cgstPaise],
    ['SGST', order.sgstPaise],
    ['IGST', order.igstPaise],
  ].filter((row): row is [string, number] => Boolean(row[1]))

  return (
    <section className="grid gap-6 rounded-lg bg-light-100 p-5 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-body1 font-semibold text-dark-500 sm:text-h6">Items</h2>
        <ul className="flex flex-col gap-2">
          {(order.items ?? []).map((item) => (
            <li key={item.id ?? item.sku} className="flex justify-between gap-4 text-body3 text-dark-500 sm:text-body1">
              <span>
                {item.quantity} × {item.productName}
              </span>
              <span className="whitespace-nowrap">{money(item.lineNetPaise)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 flex flex-col gap-1 border-t-[0.5px] border-dark-100 pt-3 text-body3 text-dark-400 sm:text-body1">
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
          <div className="flex justify-between text-body1 font-semibold text-dark-500 sm:text-h6">
            <dt>{paid ? 'Total paid' : 'Total'}</dt>
            <dd>{money(order.grandTotalPaise)}</dd>
          </div>
          {showTax && taxes.length > 0 && (
            <div className="flex justify-between text-body3 text-dark-300">
              <dt>Includes</dt>
              <dd>{taxes.map(([label, paise]) => `${label} ${money(paise)}`).join(' · ')}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-body1 font-semibold text-dark-500 sm:text-h6">Delivering to</h2>
        <p className="text-body3 text-dark-400 sm:text-body1">
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
  )
}
