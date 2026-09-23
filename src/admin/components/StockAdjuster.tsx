'use client'

import { Button, toast, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

const STAFF_TYPES = [
  { value: 'RECEIVED', label: 'Stock received', sign: '+' },
  { value: 'RETURNED', label: 'Customer return', sign: '+' },
  { value: 'ADJUST_UP', label: 'Count correction (add)', sign: '+' },
  { value: 'ADJUST_DOWN', label: 'Count correction (remove)', sign: '−' },
  { value: 'DAMAGED', label: 'Damaged or lost', sign: '−' },
] as const

/**
 * Records a stock movement from the stock level screen, so staff never type
 * a count directly. The server applies it and writes the ledger row.
 */
export const StockAdjuster = () => {
  const { id } = useDocumentInfo()
  const variant = useFormFields(([fields]) => fields.variant?.value) as number | { id: number } | undefined
  const variantId = typeof variant === 'object' && variant ? variant.id : variant

  const [type, setType] = useState<string>('RECEIVED')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (!id || !variantId) return null

  const sign = STAFF_TYPES.find((option) => option.value === type)?.sign ?? '+'

  const submit = async () => {
    const qty = Number.parseInt(quantity, 10)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Enter a quantity above zero.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: variantId, type, quantity: qty, note: note || undefined }),
      })
      const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] }
      if (!res.ok) throw new Error(body.errors?.[0]?.message ?? 'Could not record the change.')
      toast.success(`Recorded ${sign}${qty}.`)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record the change.')
      setSaving(false)
    }
  }

  return (
    <fieldset className="stock-adjuster">
      <legend>Record a stock change</legend>
      <div className="stock-adjuster__row">
        <label>
          <span>What happened</span>
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
            {STAFF_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.sign} {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="stock-adjuster__qty">
          <span>Quantity</span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="stock-adjuster__note">
          <span>Note</span>
          <input
            type="text"
            placeholder="Supplier invoice, reason…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
          />
        </label>
        <Button buttonStyle="primary" size="medium" onClick={submit} disabled={saving} margin={false}>
          {saving ? 'Saving…' : `Record ${sign}${quantity || ''}`}
        </Button>
      </div>
      <p className="stock-adjuster__hint">
        Counts can&apos;t be typed over. Every change is logged below with your name.
      </p>
    </fieldset>
  )
}

export default StockAdjuster
