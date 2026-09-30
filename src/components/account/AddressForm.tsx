'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AccountField, fieldInputClass } from '@/components/account/AccountField'
import { FormAlert } from '@/components/auth/fields'
import { useAuthSubmit } from '@/components/auth/useAuthSubmit'
import { Button } from '@/components/ui/Button'
import type { AddressType } from '@/collections/Addresses'
import { INDIAN_STATES } from '@/lib/indian-states'
import { cn } from '@/lib/utils'

export type AddressFormValues = {
  fullName: string
  phone: string
  pincode: string
  line1: string
  line2: string
  city: string
  stateCode: string
  type: AddressType
}

type TextName = Exclude<keyof AddressFormValues, 'stateCode' | 'type'>

const TYPES: { value: AddressType; label: string }[] = [
  { value: 'HOME', label: 'Home' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'OTHER', label: 'Other' },
]

/**
 * Add or edit an address, from Figma node 1127:11092. With `id` it saves over
 * that address; without, it adds a new one. Rules live on the server
 * (`src/lib/validations/account.ts`) and come back per field.
 */
export const AddressForm = ({ id, initial }: { id?: number; initial: AddressFormValues }) => {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const save = useAuthSubmit(id ? `/api/account/addresses/${id}` : '/api/account/addresses')

  const set = <K extends keyof AddressFormValues>(name: K, value: AddressFormValues[K]) => {
    setValues((v) => ({ ...v, [name]: value }))
    save.clearField(name)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!(await save.submit(values))) return
    router.push('/account/addresses')
    router.refresh()
  }

  const text = (
    name: TextName,
    label: string,
    props: {
      autoComplete: string
      inputMode?: 'numeric' | 'tel'
      maxLength: number
      type?: string
    },
  ) => {
    const error = save.fields[name]
    const fieldId = `address-${name}`
    return (
      <AccountField label={label} htmlFor={fieldId} error={error}>
        <input
          id={fieldId}
          name={name}
          type={props.type ?? 'text'}
          value={values[name]}
          onChange={(event) => set(name, event.target.value)}
          autoComplete={props.autoComplete}
          inputMode={props.inputMode}
          maxLength={props.maxLength}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-message` : undefined}
          className={fieldInputClass(error)}
        />
      </AccountField>
    )
  }

  const stateError = save.fields.stateCode

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {save.error && <FormAlert>{save.error}</FormAlert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {text('fullName', 'Full Name', { autoComplete: 'name', maxLength: 80 })}
        {text('phone', 'Mobile Number', {
          autoComplete: 'tel',
          inputMode: 'tel',
          maxLength: 16,
          type: 'tel',
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {text('pincode', 'PIN Code', {
          autoComplete: 'postal-code',
          inputMode: 'numeric',
          maxLength: 6,
        })}
        {text('line1', 'Flat, House No., Building, Apartment', {
          autoComplete: 'address-line1',
          maxLength: 120,
        })}
        {text('line2', 'Area, Street, Sector', { autoComplete: 'address-line2', maxLength: 120 })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {text('city', 'City', { autoComplete: 'address-level2', maxLength: 60 })}
        <AccountField label="State" htmlFor="address-stateCode" error={stateError}>
          <div className="relative">
            <select
              id="address-stateCode"
              name="stateCode"
              value={values.stateCode}
              onChange={(event) => set('stateCode', event.target.value)}
              autoComplete="address-level1"
              required
              aria-invalid={stateError ? true : undefined}
              aria-describedby={stateError ? 'address-stateCode-message' : undefined}
              className={cn(
                fieldInputClass(stateError),
                'appearance-none py-0 pr-12',
                !values.stateCode && 'text-dark-200',
              )}
            >
              <option value="" disabled>
                Choose a state
              </option>
              {INDIAN_STATES.map((state) => (
                <option key={state.code} value={state.code} className="text-dark-500">
                  {state.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-5 size-5 -translate-y-1/2 text-dark-300"
              aria-hidden
            />
          </div>
        </AccountField>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body1 text-dark-300">Address Type</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((option) => {
            const checked = values.type === option.value
            return (
              <label
                key={option.value}
                className="flex w-40 cursor-pointer items-center gap-4 rounded-sm p-5 text-body1 font-medium text-dark-400 has-focus-visible:ring-3 has-focus-visible:ring-brand-blue-100"
              >
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={checked}
                  onChange={() => set('type', option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    'grid size-5 place-items-center rounded-[3px] border-2',
                    checked ? 'border-dark-500 bg-dark-500 text-light-100' : 'border-dark-400',
                  )}
                >
                  {checked && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {option.label}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="blue"
          disabled={save.pending}
          className="h-12.5 w-full sm:w-58"
        >
          {save.pending ? 'Saving…' : 'Save Address'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={save.pending}
          onClick={() => router.push('/account/addresses')}
          className="h-12.5"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
