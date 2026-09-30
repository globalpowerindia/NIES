import type { CollectionConfig } from 'payload'

import { isSuperAdmin } from '@/access/roles'

export const OTP_CHANNELS = ['SMS', 'EMAIL'] as const

export type OtpChannel = (typeof OTP_CHANNELS)[number]

/**
 * One row per code sent. Only an HMAC of the code is stored, so a leaked
 * backup cannot be replayed into anyone's account. Rows double as the send
 * log the rate limits count against — see `src/lib/otp/challenges.ts`.
 *
 * Hidden from the admin: nothing here is for staff to act on.
 */
export const OtpChallenges: CollectionConfig = {
  slug: 'otp-challenges',
  labels: { singular: 'OTP challenge', plural: 'OTP challenges' },
  admin: { hidden: true, useAsTitle: 'destination' },
  access: {
    // Issued and checked only through our own handlers via the Local API.
    read: isSuperAdmin,
    create: () => false,
    update: () => false,
    delete: isSuperAdmin,
  },
  indexes: [{ fields: ['channel', 'destination'] }],
  fields: [
    {
      name: 'channel',
      type: 'select',
      required: true,
      options: [
        { label: 'SMS', value: 'SMS' },
        { label: 'Email', value: 'EMAIL' },
      ],
    },
    {
      name: 'destination',
      type: 'text',
      required: true,
      admin: { description: 'E.164 phone or lower-cased email the code went to.' },
    },
    { name: 'codeHash', type: 'text', required: true },
    { name: 'attempts', type: 'number', required: true, defaultValue: 0 },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'consumedAt', type: 'date' },
    {
      name: 'ipHash',
      type: 'text',
      index: true,
      admin: { description: 'Keyed hash of the requesting IP, for the per-IP send limit.' },
    },
  ],
}
