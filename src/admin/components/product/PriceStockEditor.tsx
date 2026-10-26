'use client'

import { Button, Link, Pill, toast, useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

import { can, canEditPrices } from '@/access/permissions'

import { parseRupees } from '@/admin/components/RupeeField'

import {
  announceStockChange,
  sendJson,
  useProductStock,
  type StockRow,
  type VariantRow,
} from './useProductStock'

const rupees = (paise: number) =>
  (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const LEVEL = {
  IN_STOCK: { label: 'In stock', style: 'success' },
  LOW_STOCK: { label: 'Low stock', style: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', style: 'error' },
} as const

const MOVES = [
  { value: 'RECEIVED', label: '+ Stock received', sign: 1 },
  { value: 'RETURNED', label: '+ Customer return', sign: 1 },
  { value: 'ADJUST_UP', label: '+ Count correction (add)', sign: 1 },
  { value: 'ADJUST_DOWN', label: '− Count correction (remove)', sign: -1 },
  { value: 'DAMAGED', label: '− Damaged or lost', sign: -1 },
] as const

type Draft = {
  sku: string
  name: string
  mrp: string
  price: string
  isActive: boolean
  lowStockThreshold: string
  allowBackorder: boolean
}

const draftOf = (variant: VariantRow, stock?: StockRow): Draft => ({
  sku: variant.sku,
  name: variant.name,
  mrp: rupees(variant.mrpPaise),
  price: rupees(variant.sellingPricePaise),
  isActive: variant.isActive,
  lowStockThreshold: String(stock?.lowStockThreshold ?? 5),
  allowBackorder: Boolean(stock?.allowBackorder),
})

/** What the signed-in user's role lets them do here; the server enforces the same rules. */
type Rights = { editVariant: boolean; createVariant: boolean; prices: boolean; adjustStock: boolean; stockSettings: boolean }

const rightsOf = (user: unknown): Rights => ({
  editVariant: can(user, 'product-variants', 'update'),
  createVariant: can(user, 'product-variants', 'create') && canEditPrices(user),
  prices: canEditPrices(user),
  adjustStock: can(user, 'stock-movements', 'create'),
  stockSettings: can(user, 'inventory', 'update'),
})

/** Rupee text to paise, or an error message. */
const money = (text: string, label: string): number | string => {
  const paise = parseRupees(text)
  if (paise === null || Number.isNaN(paise)) return `Enter the ${label} in rupees, e.g. 1250.`
  return paise
}

const StockAdjust = ({ variant, onDone }: { variant: VariantRow; onDone: () => void }) => {
  const [type, setType] = useState<string>('RECEIVED')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const sign = MOVES.find((move) => move.value === type)?.sign ?? 1

  const record = async () => {
    const qty = Number.parseInt(quantity, 10)
    if (!Number.isSafeInteger(qty) || qty <= 0) return toast.error('Enter a quantity above zero.')
    setSaving(true)
    const error = await sendJson('POST', '/api/stock-movements', {
      variant: variant.id,
      type,
      quantity: qty,
      note: note.trim() || undefined,
    })
    setSaving(false)
    if (error) return toast.error(error)
    toast.success(`${variant.sku}: recorded ${sign > 0 ? '+' : '−'}${qty}.`)
    announceStockChange()
    onDone()
  }

  return (
    <div className="price-stock__adjust">
      <label>
        <span>What happened</span>
        <select value={type} onChange={(event) => setType(event.target.value)} disabled={saving}>
          {MOVES.map((move) => (
            <option key={move.value} value={move.value}>
              {move.label}
            </option>
          ))}
        </select>
      </label>
      <label className="price-stock__qty">
        <span>Quantity</span>
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={saving}
          autoFocus
        />
      </label>
      <label className="price-stock__note">
        <span>Note</span>
        <input
          placeholder="Supplier invoice, reason…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={saving}
        />
      </label>
      <Button buttonStyle="primary" size="small" margin={false} onClick={record} disabled={saving}>
        {saving ? 'Saving…' : `Record ${sign > 0 ? '+' : '−'}${quantity || ''}`}
      </Button>
      <Button
        buttonStyle="secondary"
        size="small"
        margin={false}
        onClick={onDone}
        disabled={saving}
      >
        Cancel
      </Button>
    </div>
  )
}

const VariantEditor = ({
  variant,
  stock,
  onlyVariant,
  rights,
}: {
  variant: VariantRow
  stock?: StockRow
  onlyVariant: boolean
  rights: Rights
}) => {
  const [draft, setDraft] = useState(() => draftOf(variant, stock))
  const [saving, setSaving] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const original = draftOf(variant, stock)
  const dirty = JSON.stringify(draft) !== JSON.stringify(original)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const save = async () => {
    const mrp = money(draft.mrp, 'MRP')
    const price = money(draft.price, 'selling price')
    if (typeof mrp === 'string') return toast.error(mrp)
    if (typeof price === 'string') return toast.error(price)
    if (price > mrp) return toast.error('The selling price cannot be higher than the MRP.')
    if (!draft.sku.trim() || !draft.name.trim())
      return toast.error('A variant needs a SKU and a name.')
    const threshold = Number.parseInt(draft.lowStockThreshold, 10)
    if (!Number.isSafeInteger(threshold) || threshold < 0)
      return toast.error('Low-stock level must be 0 or more.')

    setSaving(true)
    const variantError = rights.editVariant
      ? await sendJson('PATCH', `/api/product-variants/${variant.id}`, {
          sku: draft.sku.trim(),
          name: draft.name.trim(),
          // Sent only with the price permission; the server would ignore them anyway.
          ...(rights.prices && { mrpPaise: mrp, sellingPricePaise: price }),
          isActive: draft.isActive,
        })
      : null
    const stockError =
      !variantError &&
      rights.stockSettings &&
      stock &&
      (threshold !== stock.lowStockThreshold || draft.allowBackorder !== stock.allowBackorder)
        ? await sendJson('PATCH', `/api/inventory/${stock.id}`, {
            lowStockThreshold: threshold,
            allowBackorder: draft.allowBackorder,
          })
        : null
    setSaving(false)
    const error = variantError || stockError
    if (error) return toast.error(error)
    toast.success(`${draft.sku.trim()} saved.`)
    announceStockChange()
  }

  const makeDefault = async () => {
    const error = await sendJson('PATCH', `/api/product-variants/${variant.id}`, {
      isDefault: true,
    })
    if (error) return toast.error(error)
    announceStockChange()
  }

  const available = stock ? stock.onHand - stock.reserved : 0
  const level = LEVEL[stock?.stockStatus ?? 'OUT_OF_STOCK']

  return (
    <div className={`price-stock__variant${draft.isActive ? '' : ' price-stock__variant--off'}`}>
      <div className="price-stock__grid">
        <label>
          <span>SKU</span>
          <input value={draft.sku} disabled={!rights.editVariant} onChange={(event) => set('sku', event.target.value)} />
        </label>
        <label className="price-stock__wide">
          <span>Variant name</span>
          <input value={draft.name} disabled={!rights.editVariant} onChange={(event) => set('name', event.target.value)} />
        </label>
        <label title={rights.prices ? undefined : 'Your role can’t change prices.'}>
          <span>MRP (₹)</span>
          <input
            inputMode="decimal"
            value={draft.mrp}
            disabled={!rights.editVariant || !rights.prices}
            onChange={(event) => set('mrp', event.target.value)}
          />
        </label>
        <label title={rights.prices ? undefined : 'Your role can’t change prices.'}>
          <span>Selling price (₹)</span>
          <input
            inputMode="decimal"
            value={draft.price}
            disabled={!rights.editVariant || !rights.prices}
            onChange={(event) => set('price', event.target.value)}
          />
        </label>
        <label>
          <span>Low-stock level</span>
          <input
            type="number"
            min={0}
            step={1}
            disabled={!rights.stockSettings}
            value={draft.lowStockThreshold}
            onChange={(event) => set('lowStockThreshold', event.target.value)}
          />
        </label>
      </div>

      <div className="price-stock__flags">
        <label className="price-stock__check">
          <input
            type="checkbox"
            checked={draft.isActive}
            disabled={!rights.editVariant}
            onChange={(event) => set('isActive', event.target.checked)}
          />
          On sale
        </label>
        <label className="price-stock__check">
          <input
            type="checkbox"
            checked={draft.allowBackorder}
            disabled={!rights.stockSettings}
            onChange={(event) => set('allowBackorder', event.target.checked)}
          />
          Sell when out of stock (backorder)
        </label>
        {!onlyVariant &&
          (variant.isDefault ? (
            <Pill size="small" pillStyle="light">
              Default: shown on cards
            </Pill>
          ) : (
            rights.editVariant && (
              <button type="button" className="price-stock__link" onClick={makeDefault}>
                Make default
              </button>
            )
          ))}
      </div>

      <div className="price-stock__stock">
        <div className="price-stock__counts">
          <span>
            <strong>{stock?.onHand ?? 0}</strong> on hand
          </span>
          <span>
            <strong>{stock?.reserved ?? 0}</strong> held for orders
          </span>
          <span>
            <strong>{available}</strong> available
          </span>
          <Pill size="small" pillStyle={level.style}>
            {stock?.allowBackorder && available <= 0 ? 'Backorder' : level.label}
          </Pill>
        </div>
        <div className="price-stock__actions">
          {!adjusting && rights.adjustStock && (
            <Button
              buttonStyle="secondary"
              size="small"
              margin={false}
              onClick={() => setAdjusting(true)}
            >
              Adjust stock
            </Button>
          )}
          <Link href={`/admin/collections/stock-movements?q=${encodeURIComponent(variant.sku)}`}>
            Stock history
          </Link>
          <Link href={`/admin/collections/product-variants/${variant.id}`}>
            All variant details
          </Link>
          {(rights.editVariant || rights.stockSettings) && (
            <Button
              buttonStyle="primary"
              size="small"
              margin={false}
              onClick={save}
              disabled={!dirty || saving}
            >
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </Button>
          )}
        </div>
      </div>

      {adjusting && <StockAdjust variant={variant} onDone={() => setAdjusting(false)} />}
    </div>
  )
}

const AddVariant = ({
  productId,
  first,
  onDone,
}: {
  productId: number | string
  first: boolean
  onDone: () => void
}) => {
  const [form, setForm] = useState({
    sku: '',
    name: first ? 'Standard' : '',
    mrp: '',
    price: '',
    opening: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const create = async () => {
    const mrp = money(form.mrp, 'MRP')
    const price = money(form.price, 'selling price')
    if (!form.sku.trim() || !form.name.trim()) return toast.error('Enter a SKU and a name.')
    if (typeof mrp === 'string') return toast.error(mrp)
    if (typeof price === 'string') return toast.error(price)
    if (price > mrp) return toast.error('The selling price cannot be higher than the MRP.')
    const opening = form.opening.trim() === '' ? 0 : Number.parseInt(form.opening, 10)
    if (!Number.isSafeInteger(opening) || opening < 0)
      return toast.error('Opening stock must be 0 or more.')

    setSaving(true)
    const error = await sendJson('POST', '/api/product-variants', {
      product: Number(productId),
      sku: form.sku.trim(),
      name: form.name.trim(),
      mrpPaise: mrp,
      sellingPricePaise: price,
      isActive: true,
      isDefault: first,
      openingStock: opening,
    })
    setSaving(false)
    if (error) return toast.error(error)
    toast.success(`${form.sku.trim()} added${opening ? ` with ${opening} in stock` : ''}.`)
    announceStockChange()
    onDone()
  }

  return (
    <div className="price-stock__variant price-stock__variant--new">
      <h4>{first ? 'Set the price and stock' : 'Add a variant'}</h4>
      <div className="price-stock__grid">
        <label>
          <span>SKU</span>
          <input
            value={form.sku}
            onChange={(event) => set('sku', event.target.value)}
            placeholder="Model number"
          />
        </label>
        <label className="price-stock__wide">
          <span>Variant name</span>
          <input
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Standard, or e.g. Cordless · 4Ah · Kit"
          />
        </label>
        <label>
          <span>MRP (₹)</span>
          <input
            inputMode="decimal"
            value={form.mrp}
            onChange={(event) => set('mrp', event.target.value)}
          />
        </label>
        <label>
          <span>Selling price (₹)</span>
          <input
            inputMode="decimal"
            value={form.price}
            onChange={(event) => set('price', event.target.value)}
          />
        </label>
        <label>
          <span>Opening stock</span>
          <input
            type="number"
            min={0}
            step={1}
            value={form.opening}
            onChange={(event) => set('opening', event.target.value)}
            placeholder="0"
          />
        </label>
      </div>
      <div className="price-stock__actions">
        <Button
          buttonStyle="primary"
          size="small"
          margin={false}
          onClick={create}
          disabled={saving}
        >
          {saving ? 'Adding…' : first ? 'Save price & stock' : 'Add variant'}
        </Button>
        {!first && (
          <Button
            buttonStyle="secondary"
            size="small"
            margin={false}
            onClick={onDone}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The product's "Price & stock" tab: every variant's SKU, price and stock,
 * editable in place. Stock changes go through the movement ledger, never a
 * typed-over count.
 */
export const PriceStockEditor = () => {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const rights = rightsOf(user)
  const { variants, stock, loading, error } = useProductStock(id)
  const [adding, setAdding] = useState(false)

  if (!id) {
    return (
      <p className="price-stock__empty">
        Save the product first, then set its price and stock here.
      </p>
    )
  }
  if (loading) return <p className="price-stock__empty">Loading price and stock…</p>
  if (error) return <p className="price-stock__empty price-stock__empty--error">{error}</p>

  return (
    <div className="price-stock">
      {!rights.prices && (
        <p className="price-stock__empty">Prices are read-only: your role can’t change prices.</p>
      )}
      {variants.length === 0 ? (
        rights.createVariant ? (
          <AddVariant productId={id} first onDone={() => undefined} />
        ) : (
          <p className="price-stock__empty">No price or stock yet. Someone whose role can set prices needs to add them.</p>
        )
      ) : (
        <>
          {variants.map((variant) => (
            // Re-keyed on save so the editor starts from the saved values.
            <VariantEditor
              key={`${variant.id}-${variant.sku}-${variant.mrpPaise}-${variant.sellingPricePaise}-${variant.isActive}-${stock.get(variant.id)?.lowStockThreshold}-${stock.get(variant.id)?.allowBackorder}`}
              variant={variant}
              stock={stock.get(variant.id)}
              onlyVariant={variants.length === 1}
              rights={rights}
            />
          ))}
          {rights.createVariant &&
            (adding ? (
              <AddVariant productId={id} first={false} onDone={() => setAdding(false)} />
            ) : (
              <Button buttonStyle="secondary" size="small" onClick={() => setAdding(true)}>
                + Add another variant
              </Button>
            ))}
        </>
      )}
    </div>
  )
}

export default PriceStockEditor
