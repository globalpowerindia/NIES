'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

import { useProductStock } from './useProductStock'

type Check = { ok: boolean; label: string; blocking?: boolean }

/**
 * "Ready to sell?" in the product sidebar: what a shopper needs before this
 * product can actually be bought. A missing price also stops the product
 * being made Active (see `requirePriceToActivate`).
 */
export const ReadinessPanel = () => {
  const { id } = useDocumentInfo()
  const { variants, stock, loading } = useProductStock(id)
  const images = useFormFields(([fields]) => fields.images?.value) as unknown[] | undefined
  const category = useFormFields(([fields]) => fields.category?.value)
  const status = useFormFields(([fields]) => fields.status?.value) as string | undefined
  const shortDesc = useFormFields(([fields]) => fields.shortDesc?.value) as string | undefined

  if (!id) return null

  const active = variants.filter((variant) => variant.isActive)
  const priced = active.some((variant) => variant.sellingPricePaise > 0)
  const sellable = active.some((variant) => {
    const row = stock.get(variant.id)
    return row ? row.allowBackorder || row.onHand - row.reserved > 0 : false
  })

  const checks: Check[] = [
    { ok: priced, label: 'Has a price (a variant on sale above ₹0)', blocking: true },
    { ok: sellable, label: 'In stock, or backorder allowed' },
    { ok: Array.isArray(images) && images.length > 0, label: 'Has at least one image' },
    { ok: Boolean(category), label: 'Has a category' },
    { ok: Boolean(shortDesc?.trim()), label: 'Has a short description' },
  ]
  const ready = checks.every((check) => check.ok)
  const blocked = checks.some((check) => check.blocking && !check.ok)

  return (
    <section
      className={`readiness${ready ? ' readiness--ready' : blocked ? ' readiness--blocked' : ''}`}
      aria-live="polite"
    >
      <h4>
        {loading
          ? 'Checking…'
          : ready
            ? 'Ready to sell'
            : blocked
              ? 'Not sellable yet'
              : 'Sellable, with gaps'}
      </h4>
      <ul>
        {checks.map((check) => (
          <li
            key={check.label}
            className={check.ok ? 'is-ok' : check.blocking ? 'is-blocking' : 'is-warning'}
          >
            <span aria-hidden>{check.ok ? '✓' : check.blocking ? '✕' : '!'}</span>
            {check.label}
          </li>
        ))}
      </ul>
      {!loading && blocked && (
        <p className="readiness__note">
          {status === 'ACTIVE'
            ? 'This product is Active but has no price, so shoppers cannot buy it. Set one under Price & stock.'
            : 'Set a price under Price & stock before making it Active.'}
        </p>
      )}
    </section>
  )
}

export default ReadinessPanel
