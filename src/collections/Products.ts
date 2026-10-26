import { sql } from 'drizzle-orm'
import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type Field,
  type NumberFieldSingleValidation,
} from 'payload'

import { allow, pricesField, publishedProducts } from '@/access/roles'
import { exportProducts, importProducts } from '@/admin/endpoints/productImport'
import { slugFrom } from '@/fields/slug'
import { DEFAULT_GST_RATE_BPS, GST_RATES_BPS } from '@/lib/money'
import { isPriced, loadProductStock } from '@/lib/product-stock'
import { youTubeId } from '@/lib/video'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '@/lib/revalidate'
import { fillSearchDocument } from '@/lib/search-document'
import { readDB } from '@/lib/transaction'
import { prepareProductModel } from '@/lib/product-model'
import { prepareSpin } from '@/lib/spin'
import { SPIN_MAX_FRAMES } from '@/lib/spin-rules'

/**
 * Staff can't switch a product to Active until it has a price: an active
 * variant selling above ₹0. Scripts (no signed-in user) are left alone, so
 * imports and seeds can stage products however they need.
 */
const requirePriceToActivate: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!req.user || data.status !== 'ACTIVE' || originalDoc?.status === 'ACTIVE') return data
  // Read in this request's transaction, so prices set earlier in it (a CSV import) count.
  const stock = originalDoc?.id
    ? (await loadProductStock(req.payload, [originalDoc.id], await readDB(req))).get(originalDoc.id)
    : undefined
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

/**
 * Drafts are for staff editing in the admin, who choose Save draft or
 * Publish. Everything else (seeds, scripts, the CSV import, tests) writes
 * live, as it did before products had drafts: a write that isn't a draft and
 * doesn't say otherwise publishes.
 */
const publishUnlessDraft: CollectionBeforeOperationHook = ({ args, operation }) => {
  const data = (args as { data?: Record<string, unknown> }).data
  if ((operation === 'create' || operation === 'update') && !args.draft && data && data._status === undefined) {
    data._status = 'published'
  }
  return args
}

/**
 * The storefront reads the live row, which only says "Active" once it's
 * published. A product created as an Active draft, or unpublished, would
 * otherwise show on the site; its live row is set to Hidden instead, while
 * the draft keeps the status staff chose, so publishing makes it Active.
 */
const hideUnpublished: CollectionAfterChangeHook = async ({ doc, req }) => {
  const db = await readDB(req)
  await db.execute(sql`UPDATE products SET status = 'DRAFT' WHERE id = ${doc.id} AND _status = 'draft' AND status = 'ACTIVE'`)
  return doc
}

/** A save that only touched a draft leaves the site as it was. */
const revalidateUnlessDraft: CollectionAfterChangeHook = (args) =>
  args.doc?._status === 'draft' && args.previousDoc?._status === 'draft' ? args.doc : revalidateStorefront(args)

/**
 * The rating comes from approved reviews, never from the form: a draft
 * started before a review was approved would otherwise bring the old rating
 * back when published.
 */
const syncRating: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!originalDoc?.id) return data
  const db = await readDB(req)
  const { rows } = await db.execute(sql`
    SELECT count(*) AS count, COALESCE(round(avg(rating) * 100), 0) AS avg
    FROM reviews WHERE product_id = ${originalDoc.id} AND status = 'APPROVED'
  `)
  data.ratingCount = Number(rows[0]?.count ?? 0)
  data.ratingAvg = Number(rows[0]?.avg ?? 0)
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
    readVersions: allow('products', 'read'),
    create: allow('products', 'create'),
    update: allow('products', 'update'),
    delete: allow('products', 'delete'),
  },
  // Save draft keeps edits off the site until Publish. Prices and stock live
  // on variants and the stock ledger, outside the draft: they apply at once.
  versions: { drafts: true, maxPerDoc: 30 },
  endpoints: [
    { path: '/import', method: 'post', handler: importProducts },
    { path: '/export', method: 'get', handler: exportProducts },
  ],
  hooks: {
    beforeOperation: [publishUnlessDraft],
    afterChange: [hideUnpublished, revalidateUnlessDraft],
    afterDelete: [revalidateStorefrontOnDelete],
    beforeChange: [fillSearchDocument, syncRating, requirePriceToActivate, prepareSpin, prepareProductModel],
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
      // Stored as DRAFT from before products had drafts; shown as Hidden so it
      // isn't confused with Save draft. Its own enum name: by default it would
      // share `enum_products_status` with the drafts' `_status` column.
      enumName: 'enum_products_visibility',
      options: [
        { label: 'Hidden', value: 'DRAFT' },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Archived', value: 'ARCHIVED' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Only Active products appear in the storefront, once published.',
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
              name: 'model3d',
              label: '3D model (.glb)',
              type: 'upload',
              relationTo: 'media',
              filterOptions: { mimeType: { equals: 'model/gltf-binary' } },
              admin: {
                description: 'Upload a self-contained GLB with embedded textures, up to 25 MB (under 5 MB recommended). Export without Draco, Meshopt or KTX2 compression. Adds a smooth, draggable 3D tile alongside any uploaded 360° photo sequence.',
              },
            },
            {
              name: 'spin',
              label: '360° view',
              type: 'group',
              admin: {
                description:
                  'Views around the actual product, all the same size, center and lighting. Use 72–180 evenly spaced frames for smoother dragging; up to 180 are supported. Upload them all at once: they are put in file-name order (01, 02 … 36). Shown as a "360°" tile in the gallery.',
              },
              fields: [
                {
                  name: 'frames',
                  label: 'Turntable photos',
                  type: 'upload',
                  relationTo: 'media',
                  hasMany: true,
                  maxRows: SPIN_MAX_FRAMES,
                  filterOptions: { mimeType: { contains: 'image' } },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'autoRotate',
                      label: 'Turn slowly on its own until the shopper touches it',
                      type: 'checkbox',
                      defaultValue: true,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'reverse',
                      label: 'Reverse the drag direction',
                      type: 'checkbox',
                      defaultValue: false,
                      admin: { width: '50%', description: 'Tick if the product turns the opposite way to the drag.' },
                    },
                  ],
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
              type: 'collapsible',
              label: 'Product page tabs',
              admin: {
                initCollapsed: true,
                description: 'Each one adds a tab beside Attributes and Description on the product page. Leave empty to hide the tab.',
              },
              fields: [
                { name: 'idealFor', type: 'richText', label: 'Ideal for' },
                { name: 'safetyInfo', type: 'richText', label: 'Safety information' },
                { name: 'maintenanceTips', type: 'richText', label: 'Maintenance tips' },
              ],
            },
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
            'What this product sells as: each variant’s SKU, price and stock. Changes here are saved straight away, even while the rest of the product is a draft. Stock changes are recorded as movements, so every unit has a reason and a name against it.',
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
              // GST changes what the customer pays: it needs the role's price permission.
              access: { create: pricesField, update: pricesField },
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
