import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type Field, type NumberFieldSingleValidation } from 'payload'

import { publishedProducts, isManager, isSuperAdmin } from '@/access/roles'
import { slugFrom } from '@/fields/slug'
import { DEFAULT_GST_RATE_BPS, GST_RATES_BPS } from '@/lib/money'
import { isPriced, loadProductStock } from '@/lib/product-stock'
import { youTubeId } from '@/lib/video'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'
import { fillSearchDocument } from '@/lib/search-document'

/**
 * Staff can't switch a product to Active until it has a price: an active
 * variant selling above ₹0. Scripts (no signed-in user) are left alone, so
 * imports and seeds can stage products however they need.
 */
const requirePriceToActivate: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!req.user || data.status !== 'ACTIVE' || originalDoc?.status === 'ACTIVE') return data
  const stock = originalDoc?.id ? (await loadProductStock(req.payload, [originalDoc.id])).get(originalDoc.id) : undefined
  if (!isPriced(stock)) {
    throw new APIError(
      'Add a price before making this product Active: open Price & stock and give a variant a selling price above ₹0.',
      400,
      undefined,
      true,
    )
  }
  return data
}

const validateGstRate: NumberFieldSingleValidation = (value) =>
  typeof value === 'number' && (GST_RATES_BPS as readonly number[]).includes(value)
    ? true
    : `Must be one of ${GST_RATES_BPS.join(', ')}`

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    group: 'Catalog',
    defaultColumns: ['name', 'brand', 'category', 'status', 'updatedAt'],
    components: { views: { list: { Component: '/admin/views/ProductsList#ProductsList' } } },
  },
  access: {
    read: publishedProducts,
    create: isManager,
    update: isManager,
    delete: isSuperAdmin,
  },
  hooks: {
    afterChange: [revalidateStorefront],
    afterDelete: [revalidateStorefrontOnDelete],
    beforeChange: [fillSearchDocument, requirePriceToActivate],
  },
  fields: [
    // Denormalised search text, by full-text weight. Hidden: written by
    // `fillSearchDocument`, never by hand. See src/lib/search-document.ts.
    ...(['searchA', 'searchB', 'searchC'] as const).map(
      (name): Field => ({ name, type: 'textarea', admin: { hidden: true } }),
    ),
    { name: 'name', type: 'text', required: true, index: true },
    slugFrom('name'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'DRAFT',
      index: true,
      options: [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Archived', value: 'ARCHIVED' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Only Active products appear in the storefront.',
      },
    },
    {
      name: 'sellOnline',
      label: 'Sell online',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'On: customers can add it to the cart and pay. Off: they see "Enquire on WhatsApp" instead.',
      },
    },
    {
      name: 'readiness',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/admin/components/product/ReadinessPanel#ReadinessPanel' },
      },
    },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    {
      name: 'ratingAvg',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stored x100. Maintained from approved reviews.',
      },
    },
    {
      name: 'ratingCount',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'subtitle',
                  type: 'text',
                  admin: { width: '60%', placeholder: 'Professional Heavy-Duty Electric Drill' },
                },
                { name: 'modelNumber', type: 'text', admin: { width: '40%', placeholder: 'GPG - 6D' } },
              ],
            },
            {
              name: 'badges',
              type: 'select',
              hasMany: true,
              options: [
                { label: 'New', value: 'NEW' },
                { label: 'Best seller', value: 'BEST_SELLER' },
              ],
              admin: { description: 'Tag shown on the product card. Also feeds the homepage carousels.' },
            },
            {
              name: 'images',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              filterOptions: { mimeType: { contains: 'image' } },
              admin: {
                description:
                  'Add as many as you like: upload several at once or pick from the library. The first is the card and main image. Drag to reorder.',
              },
            },
            {
              name: 'videos',
              type: 'array',
              labels: { singular: 'Video', plural: 'Videos' },
              admin: {
                description: 'Shown in the product gallery after the images. A YouTube link needs no upload.',
                initCollapsed: false,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'source',
                      type: 'select',
                      required: true,
                      defaultValue: 'youtube',
                      options: [
                        { label: 'YouTube link', value: 'youtube' },
                        { label: 'Uploaded file', value: 'upload' },
                      ],
                      admin: { width: '30%' },
                    },
                    {
                      name: 'title',
                      type: 'text',
                      admin: { width: '70%', placeholder: 'GPG-6D drilling through concrete' },
                    },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'YouTube link',
                  admin: {
                    condition: (_, sibling) => sibling?.source === 'youtube',
                    placeholder: 'https://www.youtube.com/watch?v=…',
                  },
                  validate: (value: string | null | undefined, { siblingData }: { siblingData: { source?: string } }) =>
                    siblingData?.source !== 'youtube' || youTubeId(value ?? '')
                      ? true
                      : 'Paste a YouTube video link (youtube.com/watch?v=… or youtu.be/…).',
                },
                {
                  name: 'file',
                  type: 'upload',
                  relationTo: 'media',
                  filterOptions: { mimeType: { contains: 'video' } },
                  admin: {
                    condition: (_, sibling) => sibling?.source === 'upload',
                    description: 'MP4 or WebM. Keep clips short; long videos are better on YouTube.',
                  },
                  validate: (value: unknown, { siblingData }: { siblingData: { source?: string } }) =>
                    siblingData?.source !== 'upload' || value ? true : 'Choose or upload a video file.',
                },
              ],
            },
            {
              name: 'shortDesc',
              type: 'textarea',
              maxLength: 300,
              label: 'Short description',
              admin: { description: 'One or two lines for search results and sharing previews.' },
            },
            { name: 'description', type: 'richText' },
            { name: 'keyFeatures', type: 'richText' },
            { name: 'warrantyInfo', type: 'richText', label: 'Warranty information' },
            {
              name: 'userManual',
              type: 'upload',
              relationTo: 'datasheets',
              admin: { description: 'PDF shown under "User Manual" on the product page.' },
            },
          ],
        },
        {
          label: 'Classification',
          fields: [
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              required: true,
              index: true,
            },
            { name: 'brand', type: 'relationship', relationTo: 'brands', index: true },
            {
              name: 'countryOfOrigin',
              type: 'text',
              defaultValue: 'India',
              admin: { description: 'Required on Indian e-commerce listings (Legal Metrology rules).' },
            },
            {
              name: 'similarProducts',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              maxRows: 8,
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
              admin: {
                description:
                  'For "Similar Products to Compare". Leave empty to use other products from the same category.',
              },
            },
          ],
        },
        {
          label: 'Free with purchase',
          fields: [
            {
              name: 'freeAccessories',
              type: 'array',
              labels: { singular: 'Accessory', plural: 'Accessories' },
              admin: { description: 'The "Free with purchase" box next to the price.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%', placeholder: 'Chuck' } },
                    { name: 'quantity', type: 'text', admin: { width: '20%', placeholder: '1 nos.' } },
                    { name: 'image', type: 'upload', relationTo: 'media', admin: { width: '40%' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Product page extras',
          description: 'Optional sections further down the product page.',
          fields: [
            {
              type: 'collapsible',
              label: 'Supplier brochure',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'brochureBanner',
                      type: 'upload',
                      relationTo: 'media',
                      admin: { width: '50%', description: 'Artwork with its text included.' },
                    },
                    {
                      name: 'datasheet',
                      type: 'upload',
                      relationTo: 'datasheets',
                      label: 'Brochure PDF',
                      admin: { width: '50%', description: 'Behind the "Download Brochure" button.' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'applications',
              type: 'group',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  admin: { placeholder: 'Drilling Applications' },
                },
                {
                  name: 'items',
                  type: 'array',
                  maxRows: 8,
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'label', type: 'text', required: true, admin: { width: '50%', placeholder: 'Wood' } },
                        { name: 'image', type: 'upload', relationTo: 'media', required: true, admin: { width: '50%' } },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'promoImages',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              label: 'Feature banners',
              admin: { description: 'Full-width artwork at the bottom of the page, text included.' },
            },
          ],
        },
        {
          label: 'Specs',
          fields: [
            {
              name: 'specValues',
              type: 'array',
              labels: { singular: 'Spec', plural: 'Specs' },
              admin: {
                description:
                  'Fill the value matching the definition type. Numbers are stored x100, so 12.5 mm is 1250.',
              },
              fields: [
                {
                  name: 'definition',
                  type: 'relationship',
                  relationTo: 'spec-definitions',
                  required: true,
                  index: true,
                },
                { name: 'valueText', type: 'text' },
                {
                  name: 'valueNum',
                  type: 'number',
                  admin: { step: 1, description: 'Scaled x100 so ranges can be filtered.' },
                },
                { name: 'valueBool', type: 'checkbox' },
              ],
            },
          ],
        },
        {
          label: 'Price & stock',
          description:
            'What this product sells as: each variant’s SKU, price and stock. Stock changes are recorded as movements, so every unit has a reason and a name against it.',
          fields: [
            {
              name: 'priceAndStock',
              type: 'ui',
              admin: { components: { Field: '/admin/components/product/PriceStockEditor#PriceStockEditor' } },
            },
          ],
        },
        {
          label: 'Tax & Warranty',
          fields: [
            {
              name: 'hsnCode',
              type: 'text',
              required: true,
              defaultValue: '8467',
              admin: { description: 'HSN code for the GST invoice. Power tools are usually 8467.' },
            },
            {
              name: 'gstRateBps',
              type: 'number',
              required: true,
              defaultValue: DEFAULT_GST_RATE_BPS,
              admin: {
                step: 1,
                description: 'Basis points. 1800 is 18%. Allowed: 0, 500, 1200, 1800, 2800.',
              },
              validate: validateGstRate,
            },
            { name: 'warrantyMonths', type: 'number', defaultValue: 6, min: 0 },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text', maxLength: 70 },
            { name: 'metaDescription', type: 'textarea', maxLength: 160 },
          ],
        },
      ],
    },
  ],
}
