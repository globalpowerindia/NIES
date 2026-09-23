'use client'

import { useActionState } from 'react'

import { subscribeToNewsletter, type NewsletterState } from '@/app/(frontend)/actions/newsletter'
import { cn } from '@/lib/utils'

const initial: NewsletterState = { status: 'idle', message: '' }

export const NewsletterForm = () => {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial)

  return (
    <div className="flex w-full max-w-[529px] flex-col gap-2">
      <form action={action} className="flex w-full items-stretch">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="your@address.com"
          aria-label="Email address"
          aria-describedby="newsletter-status"
          disabled={pending}
          className="min-w-0 flex-1 rounded-l-xl bg-light-100 px-6 py-4 text-body3 text-dark-500 outline-none placeholder:text-dark-400"
        />
        {/* Honeypot for bots; hidden from people and assistive tech. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-r-xl bg-brand-blue-500 px-6 py-2 text-body2 font-medium text-light-100 transition-colors hover:bg-brand-blue-600 disabled:opacity-70"
        >
          {pending ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      <p
        id="newsletter-status"
        role="status"
        className={cn('min-h-5 text-body3', state.status === 'error' ? 'text-yellow-400' : 'text-light-100')}
      >
        {state.message}
      </p>
    </div>
  )
}
