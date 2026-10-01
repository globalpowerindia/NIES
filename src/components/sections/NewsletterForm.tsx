'use client'

import { useActionState } from 'react'

import { subscribeToNewsletter, type NewsletterState } from '@/app/(frontend)/actions/newsletter'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const initial: NewsletterState = { status: 'idle', message: '' }

export const NewsletterForm = () => {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial)

  return (
    <div className="flex w-full max-w-[529px] flex-col gap-2">
      <form action={action} className="flex w-full flex-col items-stretch gap-2 md:flex-row md:gap-0">
        <Input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="your@address.com"
          aria-label="Email address"
          aria-describedby="newsletter-status"
          disabled={pending}
          className="min-w-0 flex-1 rounded-xl bg-light-100 px-6 py-4 text-body3 text-dark-500 outline-none placeholder:text-dark-400 md:rounded-none md:rounded-l-xl"
        />
        {/* Honeypot for bots; hidden from people and assistive tech. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          disabled={pending}
          className="h-12 shrink-0 rounded-xl bg-brand-blue-500 px-6 py-2 text-body2 font-medium text-light-100 transition-colors hover:bg-brand-blue-600 disabled:opacity-70 md:h-auto md:rounded-none md:rounded-r-xl"
        >
          {pending ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      <p
        id="newsletter-status"
        role="status"
        className={cn('text-body3 md:min-h-5', !state.message && 'max-md:hidden', state.status === 'error' ? 'text-yellow-400' : 'text-light-100')}
      >
        {state.message}
      </p>
    </div>
  )
}
