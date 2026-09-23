import type { DBIdentifierName, Field } from 'payload'

import { linkField } from '@/fields/link'

/**
 * Banners nest deep (homepage → block → array → overlay), so the default
 * Postgres enum names pass the 63-character limit. Suffixes keep them short
 * while staying unique per table, including the version-history tables.
 */
const shortEnum =
  (suffix: string): DBIdentifierName =>
  ({ tableName }) =>
    `enum_${tableName}_${suffix}`

/**
 * A banner is a finished image from the design team, text included. Display
 * typefaces live inside the artwork, never in site CSS, so a new banner never
 * costs a font download. The overlay is optional and uses the site font, for
 * banners that want a live heading or button on top of plain artwork.
 */
export const bannerFields = (): Field[] => [
  {
    type: 'row',
    fields: [
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        required: true,
        admin: { width: '50%', description: 'Desktop artwork, with any headline text already in it.' },
      },
      {
        name: 'mobileImage',
        type: 'upload',
        relationTo: 'media',
        admin: {
          width: '50%',
          description: 'Optional. Portrait crop for phones, so baked-in text stays readable.',
        },
      },
    ],
  },
  linkField({ label: 'Where the banner goes' }),
  {
    name: 'overlay',
    type: 'group',
    label: 'Text on top (optional)',
    admin: {
      description: 'Leave empty when the artwork already has its text and button.',
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'heading',
            type: 'textarea',
            admin: { width: '50%', rows: 2, description: 'Press Enter to break the line where the design does.' },
          },
          { name: 'subheading', type: 'text', admin: { width: '50%' } },
        ],
      },
      {
        type: 'row',
        fields: [
          { name: 'buttonLabel', type: 'text', admin: { width: '25%' } },
          {
            name: 'buttonStyle',
            type: 'select',
            enumName: shortEnum('btn'),
            defaultValue: 'red',
            options: [
              { label: 'Red', value: 'red' },
              { label: 'Blue', value: 'blue' },
              { label: 'Outline', value: 'outline' },
            ],
            admin: { width: '25%' },
          },
          {
            name: 'position',
            type: 'select',
            enumName: shortEnum('pos'),
            defaultValue: 'left',
            options: [
              { label: 'Left', value: 'left' },
              { label: 'Right', value: 'right' },
            ],
            admin: { width: '25%' },
          },
          {
            name: 'textTone',
            type: 'select',
            enumName: shortEnum('tone'),
            defaultValue: 'light',
            options: [
              { label: 'Light text', value: 'light' },
              { label: 'Dark text', value: 'dark' },
            ],
            admin: { width: '25%' },
          },
        ],
      },
      {
        name: 'shade',
        type: 'checkbox',
        defaultValue: false,
        label: 'Darken the image behind the text',
        admin: { description: 'Helps light text stay readable on busy photos.' },
      },
    ],
  },
]
