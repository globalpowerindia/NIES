'use server'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/storefront/queries'

export type NewsletterState = { status: 'idle' | 'success' | 'error'; message: string }

const emailSchema = z.email().max(254)

/**
 * Stores a newsletter sign-up. Repeat sign-ups succeed quietly (and
 * re-subscribe someone who had left), so the form never reveals whether an
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
    const existing = await payload.find({
      collection: 'newsletter-subscribers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
    const current = existing.docs[0]
    if (!current) {
      await payload.create({ collection: 'newsletter-subscribers', data: { email, status: 'SUBSCRIBED', source: 'homepage' } })
    } else if (current.status !== 'SUBSCRIBED') {
      await payload.update({ collection: 'newsletter-subscribers', id: current.id, data: { status: 'SUBSCRIBED' } })
    }
    return { status: 'success', message: 'Thanks! You’re on the list.' }
  } catch (error) {
    console.error('[newsletter] subscribe failed', error)
    return { status: 'error', message: 'Something went wrong. Please try again in a moment.' }
  }
}
