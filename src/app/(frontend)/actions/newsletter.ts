'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'
import { getPayloadClient } from '@/lib/storefront/queries'

export type NewsletterState = { status: 'idle' | 'success' | 'error'; message: string }

const emailSchema = z.email().max(254)

/**
 * Stores a newsletter sign-up. Repeat sign-ups succeed quietly (without changing an existing unsubscribe decision), so the form never reveals whether an
 * address is already on the list.
 */
export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  // Honeypot: real visitors never see or fill this field.
  if (formData.get('company')) return { status: 'success', message: 'Thanks! You’re on the list.' }

  const parsed = emailSchema.safeParse(String(formData.get('email') ?? '').trim().toLowerCase())
  if (!parsed.success) return { status: 'error', message: 'Please enter a valid email address.' }
  const email = parsed.data

  try {
    const payload = await getPayloadClient()
    const ip = clientIp({ headers: await headers() })
    const allowed = await rateLimit(payload, `newsletter:ip:${ip}`, LIMITS.newsletter)
    if (!allowed.ok) return { status: 'error', message: 'Too many sign-ups from here. Please try again later.' }
    const existing = await payload.find({
      collection: 'newsletter-subscribers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
    const current = existing.docs[0]
    if (!current) {
      await payload.create({ collection: 'newsletter-subscribers', data: { email, status: 'SUBSCRIBED', source: 'homepage' } })
    } else {
      // Preserve unsubscribe decisions. Re-subscription requires verified consent.
    }
    return { status: 'success', message: 'Thanks! You’re on the list.' }
  } catch (error) {
    console.error('[newsletter] subscribe failed', error)
    return { status: 'error', message: 'Something went wrong. Please try again in a moment.' }
  }
}
