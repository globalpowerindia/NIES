import type { Block, Field } from 'payload'

import { bannerFields } from '@/fields/banner'
import { linkField } from '@/fields/link'

const hidden: Field = {
  name: 'hidden',
  type: 'checkbox',
  defaultValue: false,
  label: 'Hide this section',
  admin: { description: 'Keeps the section and its content, but takes it off the live homepage.' },
}

const heading = (defaults: { eyebrow?: string; title?: string } = {}): Field[] => [
  {
    type: 'row',
    fields: [
      { name: 'eyebrow', type: 'text', defaultValue: defaults.eyebrow, admin: { width: '40%' } },
      {
        name: 'title',
        type: 'text',
        defaultValue: defaults.title,
        admin: { width: '60%', description: 'Leave empty for a section without a heading.' },
      },
    ],
  },
  { name: 'description', type: 'textarea' },
]

export const HeroCarouselBlock: Block = {
  slug: 'heroCarousel',
  interfaceName: 'HeroCarouselBlock',
  labels: { singular: 'Hero carousel', plural: 'Hero carousels' },
  fields: [
    hidden,
    {
      name: 'slides',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      labels: { singular: 'Slide', plural: 'Slides' },
      fields: bannerFields(),
    },
  ],
}

export const BannerRowBlock: Block = {
  slug: 'bannerRow',
  interfaceName: 'BannerRowBlock',
  labels: { singular: 'Banner row', plural: 'Banner rows' },
  fields: [
    hidden,
    {
      name: 'banners',
      type: 'array',
      minRows: 1,
      maxRows: 2,
      labels: { singular: 'Banner', plural: 'Banners' },
      admin: { description: 'One banner fills the row; two sit side by side (799 × 400 artwork each).' },
      fields: bannerFields(),
    },
  ],
}

export const WideBannerBlock: Block = {
  slug: 'wideBanner',
  interfaceName: 'WideBannerBlock',
  labels: { singular: 'Wide banner', plural: 'Wide banners' },
  fields: [
    hidden,
    {
      name: 'shape',
      type: 'select',
      defaultValue: 'feature',
      options: [
        { label: 'Feature (1620 × 500)', value: 'feature' },
        { label: 'Offer strip (1620 × 239)', value: 'strip' },
      ],
    },
    ...bannerFields(),
  ],
}

export const ProductCarouselBlock: Block = {
  slug: 'productCarousel',
  interfaceName: 'ProductCarouselBlock',
  labels: { singular: 'Product carousel', plural: 'Product carousels' },
  fields: [
    hidden,
    ...heading(),
    {
      type: 'row',
      fields: [
        {
          name: 'source',
          type: 'select',
          required: true,
          defaultValue: 'new',
          options: [
            { label: 'Products tagged "New"', value: 'new' },
            { label: 'Products tagged "Best seller"', value: 'bestSeller' },
            { label: 'Products on offer (below MRP)', value: 'offers' },
            { label: 'From one category', value: 'category' },
            { label: 'Pick products by hand', value: 'manual' },
          ],
          admin: { width: '50%' },
        },
        { name: 'limit', type: 'number', defaultValue: 12, min: 1, max: 24, admin: { width: '50%' } },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: { condition: (_, sibling) => sibling?.source === 'category' },
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        condition: (_, sibling) => sibling?.source === 'manual',
        description: 'Shown in this order. Drag to reorder.',
      },
    },
  ],
}

export const CategoryGridBlock: Block = {
  slug: 'categoryGrid',
  interfaceName: 'CategoryGridBlock',
  labels: { singular: 'Category grid', plural: 'Category grids' },
  fields: [
    hidden,
    ...heading({ eyebrow: 'Category Zone', title: 'Explore Wide Range Of Categories' }),
    {
      name: 'tiles',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      labels: { singular: 'Tile', plural: 'Tiles' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'category', type: 'relationship', relationTo: 'categories', required: true, admin: { width: '50%' } },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              admin: { width: '50%', description: 'Falls back to the category image.' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: { width: '50%', placeholder: 'Electric Drills From - ₹1000', description: 'Defaults to the category name.' },
            },
            {
              name: 'linkLabel',
              type: 'text',
              admin: { width: '50%', placeholder: 'Explore Electric Drills' },
            },
          ],
        },
      ],
    },
  ],
}

export const CollectionShowcaseBlock: Block = {
  slug: 'collectionShowcase',
  interfaceName: 'CollectionShowcaseBlock',
  labels: { singular: 'Collection showcase', plural: 'Collection showcases' },
  fields: [
    hidden,
    ...heading(),
    {
      name: 'featureType',
      type: 'radio',
      label: 'Feature',
      required: true,
      defaultValue: 'image',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'featureVideo',
          type: 'upload',
          relationTo: 'media',
          filterOptions: { mimeType: { contains: 'video' } },
          admin: {
            width: '50%',
            condition: (_, sibling) => sibling?.featureType === 'video',
            description: 'MP4 or WebM, about 588 × 612. Plays muted on a loop; keep it short and under 10 MB.',
          },
          validate: (value: unknown, { siblingData }: { siblingData: { featureType?: string } }) =>
            siblingData?.featureType !== 'video' || value ? true : 'Choose or upload a video file.',
        },
        {
          name: 'featureImage',
          type: 'upload',
          relationTo: 'media',
          filterOptions: { mimeType: { contains: 'image' } },
          admin: {
            width: '50%',
            description: 'The feature picture (588 × 612). With a video, optional: shown while it loads and to visitors who turn off motion.',
          },
          validate: (value: unknown, { siblingData }: { siblingData: { featureType?: string } }) =>
            siblingData?.featureType === 'video' || value ? true : 'Choose or upload an image.',
        },
      ],
    },
    { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, maxRows: 6 },
    {
      type: 'row',
      fields: [{ name: 'buttonLabel', type: 'text', defaultValue: 'View All', admin: { width: '40%' } }],
    },
    linkField({ name: 'buttonLink', label: 'Button link' }),
  ],
}

export const CatalogueBannerBlock: Block = {
  slug: 'catalogueBanner',
  interfaceName: 'CatalogueBannerBlock',
  labels: { singular: 'Catalogue download', plural: 'Catalogue downloads' },
  fields: [
    hidden,
    { name: 'title', type: 'text', required: true, defaultValue: 'Download our Product Catalogue' },
    { name: 'description', type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'buttonLabel', type: 'text', defaultValue: 'Download Catalogue', admin: { width: '50%' } },
        {
          name: 'file',
          type: 'upload',
          relationTo: 'datasheets',
          admin: { width: '50%', description: 'The PDF customers download.' },
        },
      ],
    },
    linkField({ name: 'buttonLink', label: 'Button link (used when no PDF is uploaded)' }),
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
  ],
}

export const ValuePropsBlock: Block = {
  slug: 'valueProps',
  interfaceName: 'ValuePropsBlock',
  labels: { singular: 'Reasons to choose us', plural: 'Reasons to choose us' },
  fields: [
    hidden,
    ...heading({ eyebrow: 'Why Choose Us', title: 'Reasons to Choose Us' }),
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      fields: [
        { name: 'icon', type: 'upload', relationTo: 'media' },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
  ],
}

export const TrustedBrandsBlock: Block = {
  slug: 'trustedBrands',
  interfaceName: 'TrustedBrandsBlock',
  labels: { singular: 'Trusted brands', plural: 'Trusted brands' },
  fields: [
    hidden,
    { name: 'title', type: 'text', required: true, defaultValue: 'Our Trusted Brands' },
    { name: 'description', type: 'textarea' },
    {
      name: 'brands',
      type: 'relationship',
      relationTo: 'brands',
      hasMany: true,
      admin: { description: 'Leave empty to show every active brand that has a logo.' },
    },
  ],
}

export const AppPromoBlock: Block = {
  slug: 'appPromo',
  interfaceName: 'AppPromoBlock',
  labels: { singular: 'App download banner', plural: 'App download banners' },
  fields: [
    hidden,
    { name: 'title', type: 'text', defaultValue: 'Shop with Ease on the Tools Hypermarket App' },
    { name: 'description', type: 'textarea', defaultValue: 'Browse, compare, and order your tools anytime, anywhere.' },
    {
      name: 'screenshot',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'App screen shown on the phone in the hand (portrait, about 550 × 685).' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'googlePlayUrl',
          type: 'text',
          label: 'Google Play link',
          admin: { width: '50%', description: 'Leave empty to hide the Google Play badge.' },
        },
        {
          name: 'appStoreUrl',
          type: 'text',
          label: 'App Store link',
          admin: { width: '50%', description: 'Leave empty to hide the App Store badge.' },
        },
      ],
    },
  ],
}

export const NewsletterBlock: Block = {
  slug: 'newsletter',
  interfaceName: 'NewsletterBlock',
  labels: { singular: 'Newsletter sign-up', plural: 'Newsletter sign-ups' },
  fields: [
    hidden,
    { name: 'title', type: 'text', required: true, defaultValue: 'Be the First to Know' },
    { name: 'description', type: 'textarea' },
  ],
}

export const HOME_BLOCKS: Block[] = [
  HeroCarouselBlock,
  BannerRowBlock,
  WideBannerBlock,
  ProductCarouselBlock,
  CategoryGridBlock,
  CollectionShowcaseBlock,
  CatalogueBannerBlock,
  ValuePropsBlock,
  AppPromoBlock,
  TrustedBrandsBlock,
  NewsletterBlock,
]
