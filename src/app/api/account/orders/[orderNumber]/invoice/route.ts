import { renderToBuffer } from '@react-pdf/renderer'

import { can } from '@/access/permissions'
import { buildInvoiceData, invoiceSeller } from '@/lib/invoice/invoice-data'
import { InvoiceDocument } from '@/lib/invoice/InvoiceDocument'
import { getCustomerOrder } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import type { Order } from '@/payload-types'

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } })

/**
 * The GST invoice for a paid order, as a PDF. The customer who placed the
 * order may download it, and so may staff who can read orders (the admin's
 * Invoice button). Anyone else gets a 404, so an order number alone reveals
 * nothing. Rendered on request from the order's snapshot: nothing is stored.
 */
export const GET = async (request: Request, { params }: { params: Promise<{ orderNumber: string }> }): Promise<Response> => {
  const orderNumber = decodeURIComponent((await params).orderNumber)
  const payload = await getPayloadClient()

  const customer = await getCurrentCustomer()
  let order: Order | null = customer ? await getCustomerOrder(payload, customer.id, orderNumber) : null
  if (!order) {
    const { user } = await payload.auth({ headers: request.headers })
    if (!can(user, 'orders', 'read')) return notFound()
    const { docs } = await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    order = docs[0] ?? null
  }
  if (!order) return notFound()

  const seller = invoiceSeller(await payload.findGlobal({ slug: 'checkout-settings', depth: 0 }))
  if (!seller) {
    return new Response('Invoices are not available yet. Please contact us for a copy.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
  const invoice = buildInvoiceData(order, seller)
  if (!invoice) return notFound()

  // Called as a function, not createElement: renderToBuffer is typed to take the <Document> itself. No hooks inside.
  const pdf = await renderToBuffer(InvoiceDocument({ invoice }))
  const filename = `Invoice-${invoice.invoiceNumber.replace(/[^\w-]/g, '_')}.pdf`
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
