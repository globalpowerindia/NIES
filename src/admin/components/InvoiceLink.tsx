'use client'

import { useFormFields } from '@payloadcms/ui'

/**
 * Opens the order's GST invoice, the same PDF the customer downloads. Shown
 * once the order has an invoice number, which payment capture assigns. The
 * route checks the staff session itself.
 */
export const InvoiceLink = () => {
  const orderNumber = useFormFields(([fields]) => fields.orderNumber?.value) as string | undefined
  const invoiceNumber = useFormFields(([fields]) => fields.invoiceNumber?.value) as string | undefined
  if (!orderNumber || !invoiceNumber) return null

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <a
        className="btn btn--style-secondary btn--size-small"
        href={`/api/account/orders/${encodeURIComponent(orderNumber)}/invoice`}
        target="_blank"
        rel="noopener noreferrer"
      >
        GST invoice {invoiceNumber} (PDF)
      </a>
    </div>
  )
}
