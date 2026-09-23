import type { TextField } from 'payload'

export const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Payload ships a `slugField` helper but it is flagged experimental, and a slug
 * change breaks live product URLs. This keeps the behaviour under our control.
 */
export const slugFrom = (sourceField: string): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: `Generated from ${sourceField} when left blank. Changing it breaks existing links.`,
  },
  hooks: {
    beforeValidate: [
      ({ data, value }) => {
        const source = value || (data?.[sourceField] as string | undefined)
        return typeof source === 'string' && source ? toSlug(source) : value
      },
    ],
  },
})
