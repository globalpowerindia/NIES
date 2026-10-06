'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { useState } from 'react'

const toText = (paise: number | null | undefined) =>
  typeof paise === 'number'
    ? (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : ''

/** "1,250", "₹1250.5" and "1250.50" all mean 125050 paise. Empty is null; nonsense is NaN. */
export const parseRupees = (text: string): number | null => {
  const cleaned = text.replace(/[₹,\s]/g, '')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return Number.NaN
  const [whole, fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

/**
 * Money is stored as whole paise, but nobody should have to type 125000 to
 * mean ₹1,250. This shows and takes rupees, and saves paise.
 */
export const RupeeField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, disabled } = useField<number | null>({
    path: path ?? field.name,
  })
  const [text, setText] = useState(toText(value))
  const [invalid, setInvalid] = useState(false)

  // Follow outside changes (a reset, or another field setting this one).
  const [followed, setFollowed] = useState(value)
  if (followed !== value) {
    setFollowed(value)
    if (parseRupees(text) !== value) setText(toText(value))
  }

  const description =
    typeof field.admin?.description === 'string' ? field.admin.description : undefined

  return (
    <div
      className={`field-type number rupee-field${showError || invalid ? ' error' : ''}`}
      style={field.admin?.width ? { width: field.admin.width } : undefined}
    >
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <div className="rupee-field__input">
          <span aria-hidden>₹</span>
          <input
            id={`field-${(path ?? field.name).replace(/\./g, '__')}`}
            inputMode="decimal"
            value={text}
            disabled={readOnly || disabled}
            placeholder="0"
            onChange={(event) => {
              setText(event.target.value)
              const paise = parseRupees(event.target.value)
              setInvalid(Number.isNaN(paise))
              if (!Number.isNaN(paise)) setValue(paise)
            }}
            onBlur={() => !invalid && setText(toText(value))}
          />
        </div>
        {invalid && (
          <p className="rupee-field__invalid">Enter an amount in rupees, e.g. 1250 or 1,250.50</p>
        )}
      </div>
      {description && <FieldDescription description={description} path={path} />}
    </div>
  )
}

export default RupeeField
