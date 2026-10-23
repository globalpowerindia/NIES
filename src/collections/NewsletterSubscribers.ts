import type { CollectionConfig } from 'payload'

import { allow } from '@/access/roles'

/**
 * Sign-ups from the storefront newsletter form. Written only by the server
 * action in `src/app/(frontend)/actions/newsletter.ts`, never through the
 * public REST API, so the list can't be read or spammed from outside.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: { singular: 'Subscriber', plural: 'Newsletter subscribers' },
  admin: {
    useAsTitle: 'email',
    group: 'Storefront',
    defaultColumns: ['email', 'status', 'source', 'createdAt'],
  },
  access: {
    read: allow('newsletter-subscribers', 'read'),
    create: () => false,
    update: allow('newsletter-subscribers', 'update'),
    delete: allow('newsletter-subscribers', 'delete'),
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'SUBSCRIBED',
      options: [
        { label: 'Subscribed', value: 'SUBSCRIBED' },
        { label: 'Unsubscribed', value: 'UNSUBSCRIBED' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'homepage',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
