import type { Block, Field } from 'payload'

/**
 * The sections staff can add to a product page, each with its own fixed layout.
 * Staff choose the heading and the order; the storefront handles the design.
 */

const heading: Field = {
  name: 'heading',
  type: 'text',
  required: true,
  admin: { description: 'The title shown above this section.' },
}

const TableSection: Block = {
  slug: 'sectionTable',
  labels: { singular: 'Table', plural: 'Tables' },
  admin: { group: 'Section types' },
  fields: [
    { ...heading, admin: { placeholder: 'Special Features', description: heading.admin?.description } },
    {
      name: 'rows',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Row', plural: 'Rows' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { width: '40%', placeholder: 'Seals' } },
            { name: 'value', type: 'text', required: true, admin: { width: '60%', placeholder: 'German Parker' } },
          ],
        },
      ],
    },
  ],
}

const ItemsSection: Block = {
  slug: 'sectionItems',
  labels: { singular: 'Items with quantity', plural: 'Items with quantity' },
  admin: { group: 'Section types' },
  fields: [
    { ...heading, admin: { placeholder: 'Accessories', description: heading.admin?.description } },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { width: '40%', placeholder: 'Long gun' } },
            { name: 'quantity', type: 'text', admin: { width: '20%', placeholder: '1 No.' } },
            { name: 'image', type: 'upload', relationTo: 'media', admin: { width: '40%' } },
          ],
        },
      ],
    },
  ],
}

const FeaturesSection: Block = {
  slug: 'sectionFeatures',
  labels: { singular: 'Feature list', plural: 'Feature lists' },
  admin: { group: 'Section types' },
  fields: [
    { ...heading, admin: { placeholder: 'Features', description: heading.admin?.description } },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Feature', plural: 'Features' },
      fields: [{ name: 'text', type: 'text', required: true, admin: { placeholder: 'IEC standard solid motor' } }],
    },
  ],
}

const TextSection: Block = {
  slug: 'sectionText',
  labels: { singular: 'Text', plural: 'Text' },
  admin: { group: 'Section types' },
  fields: [
    { ...heading, admin: { placeholder: 'Applications', description: heading.admin?.description } },
    { name: 'body', type: 'richText', required: true },
  ],
}

const CardsSection: Block = {
  slug: 'sectionCards',
  labels: { singular: 'Cards', plural: 'Cards' },
  admin: { group: 'Section types' },
  fields: [
    { ...heading, admin: { placeholder: 'Customized Options', description: heading.admin?.description } },
    { name: 'intro', type: 'textarea', admin: { rows: 2, description: 'Optional line above the cards.' } },
    {
      name: 'cards',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Card', plural: 'Cards' },
      fields: [
        { name: 'title', type: 'text', required: true, admin: { placeholder: 'Turbo roto gun' } },
        { name: 'text', type: 'textarea', admin: { rows: 2 } },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}

export const PRODUCT_SECTION_BLOCKS: Block[] = [
  TableSection,
  ItemsSection,
  FeaturesSection,
  TextSection,
  CardsSection,
]
