import type { GlobalConfig } from 'payload'

import { can } from '@/access/permissions'
import { allow, anyone } from '@/access/roles'
import { linkField } from '@/fields/link'
import { revalidateStorefrontGlobal } from '@/lib/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Header & Footer',
  admin: {
    // Read publicly by the storefront; in the admin, only for roles that may change it.
    hidden: ({ user }) => !can(user, 'site-settings', 'update'),
    group: 'Storefront',
    description: 'Shown on every storefront page.',
  },
  access: {
    read: anyone,
    update: allow('site-settings', 'update'),
  },
  hooks: { afterChange: [revalidateStorefrontGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'siteName', type: 'text', required: true, defaultValue: 'Tools Hypermarket', admin: { width: '50%' } },
                { name: 'logo', type: 'upload', relationTo: 'media', admin: { width: '50%' } },
              ],
            },
          ],
        },
        {
          label: 'Header',
          fields: [
            {
              name: 'offers',
              type: 'array',
              labels: { singular: 'Offer line', plural: 'Offer lines' },
              admin: {
                description:
                  'Rotates in the blue bar at the very top. Give an offer a link so shoppers can act on it, and an end time to show a countdown; it hides itself once that time passes.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'tag',
                      type: 'text',
                      maxLength: 16,
                      admin: { width: '25%', placeholder: 'SALE', description: 'Optional highlighted label in front.' },
                    },
                    {
                      name: 'text',
                      type: 'text',
                      required: true,
                      admin: { width: '75%', placeholder: 'Up to 40% off selected power tools' },
                    },
                  ],
                },
                linkField({ name: 'link', label: 'Link', defaultType: 'none' }),
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'linkLabel',
                      type: 'text',
                      defaultValue: 'Shop now',
                      admin: { width: '40%', description: 'Shown when the offer has a link.' },
                    },
                    {
                      name: 'endsAt',
                      type: 'date',
                      label: 'Ends at',
                      admin: {
                        width: '60%',
                        date: { pickerAppearance: 'dayAndTime' },
                        description: 'Optional. Shows "Ends in…" and hides the offer after this time.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: 'utilityLinks',
              type: 'array',
              maxRows: 4,
              labels: { singular: 'Download link', plural: 'Download links' },
              admin: { description: 'Shown under "Downloads" in the footer, e.g. Price List, Download Catalogue, Download App.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true, admin: { width: '40%' } },
                    {
                      name: 'icon',
                      type: 'select',
                      defaultValue: 'book',
                      options: [
                        { label: '₹ Price', value: 'rupee' },
                        { label: 'Book', value: 'book' },
                        { label: 'Phone', value: 'phone' },
                      ],
                      admin: { width: '20%' },
                    },
                    {
                      name: 'file',
                      type: 'upload',
                      relationTo: 'datasheets',
                      admin: { width: '40%', description: 'A PDF to download. Overrides the link.' },
                    },
                  ],
                },
                linkField(),
              ],
            },
            {
              name: 'navCategories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
              label: 'Menu categories',
              admin: { description: 'The grey category bar, in this order. Drag to reorder.' },
            },
          ],
        },
        {
          label: 'Search',
          fields: [
            {
              name: 'topMovingProducts',
              type: 'array',
              maxRows: 8,
              labels: { singular: 'Tile', plural: 'Tiles' },
              admin: {
                description:
                  'Shown under the search box before anything is typed, beside the shopper’s own recent searches. Curated, not calculated.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true, admin: { width: '50%' } },
                    { name: 'image', type: 'upload', relationTo: 'media', required: true, admin: { width: '50%' } },
                  ],
                },
                linkField(),
              ],
            },
          ],
        },
        {
          label: 'Downloads',
          description:
            'The PDFs behind /catalogue and /price-list (the top-bar links and the homepage catalogue banner). Upload under Library → Datasheets.',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'catalogueFile', label: 'Product catalogue (PDF)', type: 'upload', relationTo: 'datasheets', admin: { width: '50%' } },
                { name: 'priceListFile', label: 'Price list (PDF)', type: 'upload', relationTo: 'datasheets', admin: { width: '50%' } },
              ],
            },
          ],
        },
        {
          label: 'Footer',
          fields: [
            {
              name: 'footerColumns',
              type: 'array',
              maxRows: 4,
              labels: { singular: 'Link column', plural: 'Link columns' },
              fields: [
                { name: 'heading', type: 'text', required: true },
                {
                  name: 'links',
                  type: 'array',
                  fields: [{ name: 'label', type: 'text', required: true }, linkField()],
                },
              ],
            },
            {
              name: 'socialLinks',
              type: 'array',
              maxRows: 6,
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'platform',
                      type: 'select',
                      required: true,
                      options: ['facebook', 'instagram', 'whatsapp', 'youtube'].map((value) => ({
                        label: value[0].toUpperCase() + value.slice(1),
                        value,
                      })),
                      admin: { width: '30%' },
                    },
                    { name: 'url', type: 'text', required: true, admin: { width: '70%' } },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'tollFreeNumber', type: 'text', defaultValue: '+91 70341 27770', admin: { width: '50%' } },
                {
                  name: 'whatsappNumber',
                  type: 'text',
                  admin: { width: '50%', description: 'For the floating chat button. Digits with country code, e.g. 917034127770.' },
                },
              ],
            },
            {
              name: 'certifications',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              admin: { description: 'Logos in the footer strip (ISO, MSME, GeM…).' },
            },
            { name: 'paymentMethodsImage', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Product page',
          description: 'The same on every product page. Leave a field empty to use the standard wording.',
          fields: [
            {
              name: 'productPage',
              type: 'group',
              fields: [
                {
                  type: 'collapsible',
                  label: 'Why buy from us',
                  fields: [
                    {
                      name: 'trustBadge',
                      type: 'text',
                      admin: { placeholder: 'Kerala based tools supplier' },
                    },
                    {
                      name: 'extraStats',
                      type: 'array',
                      label: 'Extra figures',
                      maxRows: 3,
                      labels: { singular: 'Figure', plural: 'Figures' },
                      admin: {
                        description:
                          'Shown beside the automatic product, category and brand counts, exactly as typed. Only add what you can back up.',
                      },
                      fields: [
                        {
                          type: 'row',
                          fields: [
                            { name: 'value', type: 'text', required: true, admin: { width: '40%', placeholder: '2015' } },
                            { name: 'label', type: 'text', required: true, admin: { width: '60%', placeholder: 'In business since' } },
                          ],
                        },
                      ],
                    },
                    {
                      name: 'promises',
                      type: 'array',
                      labels: { singular: 'Promise', plural: 'Promises' },
                      admin: {
                        description:
                          'Replaces the standard Genuine Products, Secure Payments, Returns & Refunds and Talk to Us. The warranty and GST invoice are added automatically.',
                      },
                      fields: [
                        {
                          type: 'row',
                          fields: [
                            {
                              name: 'icon',
                              type: 'select',
                              required: true,
                              defaultValue: 'quality',
                              options: ['quality', 'payment', 'verified', 'trust', 'help', 'shipping', 'tools'],
                              admin: { width: '30%' },
                            },
                            { name: 'title', type: 'text', required: true, admin: { width: '70%' } },
                          ],
                        },
                        { name: 'detail', type: 'textarea', required: true, admin: { rows: 2 } },
                        {
                          type: 'row',
                          fields: [
                            { name: 'linkLabel', type: 'text', admin: { width: '50%', placeholder: 'Read the policy' } },
                            { name: 'linkHref', type: 'text', admin: { width: '50%', placeholder: '/returns' } },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Bulk order card',
                  fields: [
                    { name: 'bulkEnabled', type: 'checkbox', defaultValue: true, label: 'Show this card' },
                    { name: 'bulkTitle', type: 'text', admin: { placeholder: 'Buying for a workshop or team?' } },
                    {
                      name: 'bulkText',
                      type: 'textarea',
                      admin: { rows: 2, placeholder: "Message us with the quantity you need and we'll get back to you." },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
