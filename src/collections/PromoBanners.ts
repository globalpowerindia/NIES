import type { CollectionConfig, Condition, TextFieldSingleValidation } from 'payload'

import { allow } from '@/access/roles'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'

export const PROMO_PAGE_TYPES = [
  { label: 'Category pages', value: 'category' },
  { label: 'Brand pages', value: 'brand' },
  { label: 'Search results', value: 'search' },
  { label: 'Product pages', value: 'product' },
] as const

export type PromoPageType = (typeof PROMO_PAGE_TYPES)[number]['value']

const hasType = (data: Record<string, unknown> | undefined, types: PromoPageType[]) =>
  types.some((type) => (data?.showOn as string[] | undefined)?.includes(type))

const showsOn =
  (...types: PromoPageType[]): Condition =>
  (data) =>
    hasType(data, types)

const validateLink: TextFieldSingleValidation = (value) =>
  !value || value.startsWith('/') || /^https?:\/\//.test(value)
    ? true
    : 'Start with "/" for a page on this site (e.g. /category/power-tools) or https:// for another site.'

/**
 * Image banners staff place on listing and product pages, e.g. a sander promo
 * on the Power Tools category or a battery offer on cordless tool pages. Each
 * limit narrows where it shows; a limit left empty means "all".
 */
export const PromoBanners: CollectionConfig = {
  slug: 'promo-banners',
  labels: { singular: 'Promo banner', plural: 'Promo banners' },
  admin: {
    useAsTitle: 'name',
    group: 'Storefront',
    defaultColumns: ['name', 'showOn', 'isActive', 'startsAt', 'endsAt', 'updatedAt'],
    description:
      'Rows of one to three image banners on category, brand, search and product pages. Several rows can match a page; they show in Order.',
  },
  // The storefront reads these server-side; only staff who may view them need API access.
  access: {
    read: allow('promo-banners', 'read'),
    create: allow('promo-banners', 'create'),
    update: allow('promo-banners', 'update'),
    delete: allow('promo-banners', 'delete'),
  },
  hooks: { afterChange: [revalidateStorefront], afterDelete: [revalidateStorefrontOnDelete] },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'For staff only, e.g. "Ingco sander – Diwali".' },
    },
    {
      name: 'isActive',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Off: hidden everywhere, whatever the dates say.' },
    },
    {
      name: 'startsAt',
      label: 'Show from',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' }, description: 'Empty: straight away.' },
    },
    {
      name: 'endsAt',
      label: 'Show until',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' }, description: 'Empty: until switched off.' },
      validate: (value: unknown, { siblingData }: { siblingData: { startsAt?: string | null } }) =>
        value && siblingData.startsAt && new Date(value as string) <= new Date(siblingData.startsAt)
          ? '"Show until" must be after "Show from".'
          : true,
    },
    {
      name: 'sortOrder',
      label: 'Order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower shows first when several rows share a spot.' },
    },
    {
      name: 'banners',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 3,
      labels: { singular: 'Banner', plural: 'Banners' },
      admin: {
        initCollapsed: false,
        description:
          'One to three banners, shown side by side in one row about 250px tall (on phones, a row you swipe). Artwork for one banner: 1250 × 250; two: 620 × 250 each; three: 410 × 250 each. Edges may be trimmed to fit, so keep text away from them.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: { description: 'Its alt text is read out to screen readers.' },
        },
        {
          name: 'mobileImage',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Optional phone artwork, 720 × 288. Empty: phones get the desktop image.' },
        },
        {
          name: 'link',
          type: 'text',
          validate: validateLink,
          admin: {
            description: 'Where a click goes: /products/… or /category/… on this site, or https://… (opens in a new tab). Empty: not clickable.',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Where it shows',
      fields: [
        {
          name: 'showOn',
          type: 'select',
          hasMany: true,
          required: true,
          options: [...PROMO_PAGE_TYPES],
        },
        {
          name: 'categories',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          admin: {
            condition: showsOn('category', 'product'),
            description:
              'Only on these categories (sub-categories included): their category pages, and product pages of products in them. Empty: all categories.',
          },
        },
        {
          name: 'brands',
          type: 'relationship',
          relationTo: 'brands',
          hasMany: true,
          admin: {
            condition: showsOn('brand', 'product'),
            description: 'Only on these brands: their brand pages, and product pages of their products. Empty: all brands.',
          },
        },
        {
          name: 'products',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          admin: {
            condition: showsOn('product'),
            description: 'Only on these product pages. Empty: every product page the limits above allow.',
          },
        },
        {
          name: 'searchWords',
          type: 'text',
          admin: {
            condition: showsOn('search'),
            description: 'Only on searches containing one of these words, comma-separated, e.g. "sander, polisher". Empty: every search.',
          },
        },
        {
          name: 'position',
          label: 'Position in product lists',
          type: 'select',
          defaultValue: 'top',
          options: [
            { label: 'Above the products', value: 'top' },
            { label: 'Between the products', value: 'inline' },
          ],
          admin: {
            condition: showsOn('category', 'brand', 'search'),
            description: 'On product pages it always shows below the product details.',
          },
        },
        {
          name: 'afterProducts',
          label: 'After how many products',
          type: 'number',
          defaultValue: 12,
          min: 1,
          admin: {
            condition: (data) => data?.position === 'inline' && hasType(data, ['category', 'brand', 'search']),
            description: 'On each page of results. 12 always ends a full row (2, 3 or 4 products across).',
          },
        },
      ],
    },
  ],
}
