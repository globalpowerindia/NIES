import type { GlobalConfig } from 'payload'

import { anyone, isManager } from '@/access/roles'
import { linkField } from '@/fields/link'
import { revalidateStorefrontGlobal } from '@/lib/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Header & Footer',
  admin: {
    group: 'Storefront',
    description: 'Shown on every storefront page.',
  },
  access: {
    read: anyone,
    update: isManager,
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
              admin: { description: 'Rotates in the blue bar at the very top.' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            {
              name: 'utilityLinks',
              type: 'array',
              maxRows: 4,
              labels: { singular: 'Top-bar link', plural: 'Top-bar links' },
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
      ],
    },
  ],
}
