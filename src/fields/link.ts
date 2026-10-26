import type { GroupField } from 'payload'

/** A site path (`/…`, but not `//host` or `/\host`) or an absolute https URL. */
export const isSafeLinkUrl = (value: string): boolean => {
  const url = value.trim()
  if (/[\x00-\x20\x7f\\]/.test(url)) return false
  if (url.startsWith('/')) return !url.startsWith('//')
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

type LinkFieldOptions = {
  name?: string
  label?: string
  required?: boolean
}

/**
 * Staff pick a category or product from a list instead of typing URLs, so a
 * slug change can't silently break a homepage link. "Custom" covers pages that
 * aren't catalogue records, like /catalogue or an external site.
 */
export const linkField = ({ name = 'link', label = 'Link', required }: LinkFieldOptions = {}): GroupField => ({
  name,
  label,
  type: 'group',
  admin: { hideGutter: true },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          // Link groups nest inside arrays and blocks; keep the enum name short.
          enumName: ({ tableName }) => `enum_${tableName}_lnk`,
          required,
          defaultValue: 'category',
          options: [
            { label: 'Category', value: 'category' },
            { label: 'Product', value: 'product' },
            { label: 'Custom URL', value: 'custom' },
            { label: 'No link', value: 'none' },
          ],
          admin: { width: '30%' },
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
          admin: { width: '70%', condition: (_, sibling) => sibling?.type === 'category' },
        },
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          admin: { width: '70%', condition: (_, sibling) => sibling?.type === 'product' },
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            width: '70%',
            placeholder: '/catalogue or https://…',
            condition: (_, sibling) => sibling?.type === 'custom',
          },
          // A path on this site or an https address; never javascript:, data: or a protocol-relative //host.
          validate: (value: string | null | undefined, { siblingData }: { siblingData: { type?: string } }) =>
            siblingData?.type !== 'custom' || isSafeLinkUrl(value ?? '')
              ? true
              : 'Enter a path on this site (e.g. /catalogue) or a full https:// address.',
        },
      ],
    },
  ],
})
