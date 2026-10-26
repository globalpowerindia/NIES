import type { Payload } from 'payload'

import { env } from '@/lib/env'
import { formatCurrency } from '@/lib/money'
import type { Order } from '@/payload-types'

/**
 * Order emails. Inline styles and tables only, since that is what mail
 * clients render. Every value from the order is escaped: names and addresses
 * are typed by customers.
 */

const escape = (value: string | null | undefined) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

const money = (paise: number | null | undefined) => formatCurrency(paise ?? 0, { showPaise: true })

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

const orderUrl = (order: Order) => `${siteUrl()}/checkout/complete/${encodeURIComponent(order.orderNumber)}`

const addressText = (order: Order) =>
  [order.shipLine1, order.shipLine2, order.shipLandmark, `${order.shipCity}, ${order.shipStateName} - ${order.shipPincode}`]
    .filter(Boolean)
    .join(', ')

const totalsRows = (order: Order): [string, string][] => [
  ['Items', money(order.subtotalPaise)],
  ...(order.discountPaise ? ([[`Coupon${order.couponCode ? ` ${order.couponCode}` : ''}`, `− ${money(order.discountPaise)}`]] as [string, string][]) : []),
  ['Delivery', order.shippingPaise ? money(order.shippingPaise) : order.deliveryDiscountPaise && order.couponCode ? `Free (coupon ${order.couponCode})` : 'Free'],
  ['Total paid', money(order.grandTotalPaise)],
]

const itemsTable = (order: Order) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
    ${(order.items ?? [])
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8e8e8; font-size: 14px; color: #1c1c1c;">
          ${escape(item.productName)}<br />
          <span style="color: #7b7b7b; font-size: 12px;">SKU ${escape(item.sku)} · Qty ${item.quantity}</span>
        </td>
        <td align="right" style="padding: 10px 0; border-bottom: 1px solid #e8e8e8; font-size: 14px; color: #1c1c1c; white-space: nowrap;">
          ${money(item.lineNetPaise)}
        </td>
      </tr>`,
      )
      .join('')}
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
    ${totalsRows(order)
      .map(
        ([label, value], index, rows) => `
      <tr>
        <td style="padding: 4px 0; font-size: 14px; color: ${index === rows.length - 1 ? '#1c1c1c; font-weight: 600' : '#434343'};">${escape(label)}</td>
        <td align="right" style="padding: 4px 0; font-size: 14px; color: ${index === rows.length - 1 ? '#1c1c1c; font-weight: 600' : '#434343'};">${escape(value)}</td>
      </tr>`,
      )
      .join('')}
  </table>`

const frame = (title: string, body: string) => `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1c1c;">
    <p style="font-size: 18px; font-weight: 600; color: #293681; margin: 0 0 24px;">Tools Hypermarket</p>
    <h1 style="font-size: 22px; margin: 0 0 8px;">${title}</h1>
    ${body}
  </div>`

export const sendOrderConfirmation = async (payload: Payload, order: Order): Promise<void> => {
  if (!order.customerEmail) return
  const firstName = order.customerName.split(' ')[0]
  const text = [
    `Hi ${firstName},`,
    '',
    `Thank you for your order ${order.orderNumber}. We've received your payment and are getting it ready.`,
    '',
    ...(order.items ?? []).map((item) => `${item.quantity} × ${item.productName} — ${money(item.lineNetPaise)}`),
    '',
    ...totalsRows(order).map(([label, value]) => `${label}: ${value}`),
    '',
    `Delivering to: ${order.customerName}, ${addressText(order)}`,
    order.invoiceNumber ? `Invoice number: ${order.invoiceNumber}` : '',
    '',
    `View your order: ${orderUrl(order)}`,
  ].join('\n')

  await payload.sendEmail({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} confirmed`,
    text,
    html: frame(
      'Thank you for your order',
      `
      <p style="font-size: 15px; line-height: 1.6; color: #434343;">
        Hi ${escape(firstName)}, we've received your payment for order <strong>${escape(order.orderNumber)}</strong>
        and are getting it ready. We'll email you again when it ships.
      </p>
      ${itemsTable(order)}
      <p style="font-size: 14px; line-height: 1.6; color: #434343; margin-top: 20px;">
        <strong>Delivering to</strong><br />${escape(order.customerName)}<br />${escape(addressText(order))}
      </p>
      ${order.invoiceNumber ? `<p style="font-size: 13px; color: #7b7b7b;">Invoice number ${escape(order.invoiceNumber)}</p>` : ''}
      <p style="margin: 24px 0;">
        <a href="${orderUrl(order)}" style="background: #293681; color: #fefefe; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px;">View your order</a>
      </p>`,
    ),
  })
}

/** "New order" for the shop, to the addresses in ORDER_ALERT_EMAILS. */
export const sendNewOrderAlert = async (payload: Payload, order: Order, extra: string[] = []): Promise<void> => {
  const to = env.ORDER_ALERT_EMAILS?.split(',').map((address) => address.trim()).filter(Boolean)
  if (!to?.length) return
  const adminUrl = `${siteUrl()}/admin/collections/orders/${order.id}`
  await payload.sendEmail({
    to,
    subject: `New order ${order.orderNumber} — ${money(order.grandTotalPaise)}`,
    text: [
      `${order.customerName} (${order.customerPhone ?? 'no phone'}) paid ${money(order.grandTotalPaise)}.`,
      ...(order.items ?? []).map((item) => `${item.quantity} × ${item.productName} (${item.sku})`),
      `Ship to: ${addressText(order)}`,
      ...extra,
      '',
      adminUrl,
    ].join('\n'),
    html: frame(
      `New order ${escape(order.orderNumber)}`,
      `
      <p style="font-size: 15px; color: #434343;">${escape(order.customerName)} · ${escape(order.customerPhone)} · paid ${escape(money(order.grandTotalPaise))}</p>
      ${extra.map((line) => `<p style="font-size: 14px; color: #ce2d2a;">${escape(line)}</p>`).join('')}
      ${itemsTable(order)}
      <p style="font-size: 14px; color: #434343;">Ship to: ${escape(addressText(order))}</p>
      <p><a href="${adminUrl}" style="color: #293681;">Open in admin</a></p>`,
    ),
  })
}
