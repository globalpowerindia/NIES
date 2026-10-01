import type { NumberField, NumberFieldSingleValidation } from 'payload'

type PaiseFieldOptions = {
  name: string
  label?: string
  required?: boolean
  defaultValue?: number
  admin?: NumberField['admin']
}

/**
 * Money is stored as integer paise everywhere — Razorpay's amount field is
 * paise, so this removes every conversion boundary. The validator is the guard
 * against a float reaching the database via the API or a seed script.
 */
export const validatePaise: NumberFieldSingleValidation = (value) => {
  if (value === null || value === undefined) return true
  return Number.isSafeInteger(value) && value >= 0
    ? true
    : 'Enter a whole number of paise (₹1,250.00 is 125000)'
}

export const paiseField = ({
  name,
  label,
  required,
  defaultValue,
  admin,
}: PaiseFieldOptions): NumberField => ({
  name,
  type: 'number',
  label,
  required,
  defaultValue,
  min: 0,
  validate: validatePaise,
  admin: {
    description: 'In rupees, GST inclusive.',
    ...admin,
    // Entered in rupees, stored as paise.
    components: { Field: '/admin/components/RupeeField#RupeeField', ...admin?.components },
  },
})
