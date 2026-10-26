'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

import { FormAlert } from '@/components/auth/fields'
import { useAuthSubmit } from '@/components/auth/useAuthSubmit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type OwnReview = {
  rating: number
  title: string
  body: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  verifiedPurchase: boolean
}

const statuses = {
  PENDING: 'Your review is waiting for approval. Only you and our team can see it until it is approved.',
  APPROVED: 'Your review is published. Editing it will send it back for approval.',
  REJECTED: 'Your review was not approved. You can revise it and submit it again.',
}

export const ReviewForm = ({ productId }: { productId: number }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [eligibleProduct, setEligibleProduct] = useState<number | null>(null)
  const [review, setReview] = useState<OwnReview | null>(null)
  const [values, setValues] = useState({ rating: 0, title: '', body: '' })
  const [saved, setSaved] = useState(false)
  const submit = useAuthSubmit<{ review: OwnReview }>('/api/product-reviews')
  const prefix = `review-${productId}`

  useEffect(() => {
    const controller = new AbortController()
    const loadEligibility = async () => {
      try {
        const response = await fetch(`/api/product-reviews?productId=${productId}`, {
          cache: 'no-store', signal: controller.signal,
        })
        const data = await response.json()
        if (controller.signal.aborted) return
        if (!response.ok || !data.ok || !data.signedIn || !data.eligible) {
          setEligibleProduct(null)
          return
        }
        setReview(data.review)
        setValues(data.review ? { rating: data.review.rating, title: data.review.title, body: data.review.body } : { rating: 0, title: '', body: '' })
        setOpen(false)
        setSaved(false)
        setEligibleProduct(productId)
      } catch {
        if (!controller.signal.aborted) setEligibleProduct(null)
      }
    }
    void loadEligibility()
    return () => controller.abort()
  }, [productId])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const reply = await submit.submit({ productId, ...values })
    if (!reply) return
    setReview(reply.review)
    setSaved(true)
    router.refresh()
  }

  if (eligibleProduct !== productId) return null

  return (
    <div className="flex w-full max-w-[32rem] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-body2 font-semibold text-dark-500 lg:text-h6">Review this product</p>
        <p className="text-[0.75rem] leading-5 text-dark-300 lg:text-body1">Share your thoughts with other customers</p>
      </div>
      <Button
        type="button"
        variant="blue"
        aria-expanded={open}
        aria-controls={`${prefix}-panel`}
        onClick={() => setOpen(!open)}
        className="h-10 w-[14.25rem] text-body3 lg:h-[3.125rem] lg:text-body2"
      >
        {open ? 'Close review form' : review ? 'View/Edit Review' : 'Write a Review'}
      </Button>
      {open && (
        <div id={`${prefix}-panel`} className="flex flex-col gap-4">
            <form onSubmit={save} className="flex flex-col gap-4">
              <p className="text-body3 text-dark-400">Reviews are checked before publication. Please describe your experience and avoid sharing personal information.</p>
              {review && <p role="status" className="text-body3 text-brand-blue-500">{saved ? 'Review saved. ' : ''}{statuses[review.status]}</p>}
              {submit.error && <FormAlert>{submit.error}</FormAlert>}
              <fieldset disabled={submit.pending} className="flex flex-col gap-4">
                <legend className="sr-only">Your product review</legend>
                <fieldset aria-describedby={submit.fields.rating ? `${prefix}-rating-error` : undefined}>
                  <legend className="mb-2 text-body2 font-medium">Rating</legend>
                  <div className="flex flex-nowrap gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <label key={rating} className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md">
                        <input type="radio" name={`${prefix}-rating`} value={rating} checked={values.rating === rating} required
                          className="peer sr-only"
                          aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                          onChange={() => { setValues({ ...values, rating }); setSaved(false); submit.clearField('rating') }} />
                        <span className="flex size-full items-center justify-center rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                          <Star aria-hidden="true" className={`size-8 transition-colors ${rating <= values.rating ? 'fill-green-400 stroke-green-400' : 'fill-transparent stroke-dark-300'}`} />
                        </span>
                      </label>
                    ))}
                  </div>
                  {submit.fields.rating && <p id={`${prefix}-rating-error`} className="text-body3 text-brand-red-500">{submit.fields.rating}</p>}
                </fieldset>
                <label htmlFor={`${prefix}-title`} className="text-body2 font-medium">Review title</label>
                <Input id={`${prefix}-title`} value={values.title} minLength={3} maxLength={120} required
                  aria-invalid={Boolean(submit.fields.title)} aria-describedby={submit.fields.title ? `${prefix}-title-error` : undefined}
                  onChange={(event) => { setValues({ ...values, title: event.target.value }); setSaved(false); submit.clearField('title') }}
                  className="rounded-lg border border-dark-200 bg-white p-3 text-body2" />
                {submit.fields.title && <p id={`${prefix}-title-error`} className="text-body3 text-brand-red-500">{submit.fields.title}</p>}
                <label htmlFor={`${prefix}-body`} className="text-body2 font-medium">Your experience</label>
                <textarea id={`${prefix}-body`} value={values.body} rows={5} minLength={10} maxLength={2500} required
                  aria-invalid={Boolean(submit.fields.body)} aria-describedby={submit.fields.body ? `${prefix}-body-error` : undefined}
                  onChange={(event) => { setValues({ ...values, body: event.target.value }); setSaved(false); submit.clearField('body') }}
                  className="w-full rounded-lg border border-dark-200 bg-white p-3 text-body2 focus-visible:outline-brand-blue-500" />
                {submit.fields.body && <p id={`${prefix}-body-error`} className="text-body3 text-brand-red-500">{submit.fields.body}</p>}
                <Button type="submit" variant="blue">{submit.pending ? 'Submitting…' : review ? 'Update review' : 'Submit review'}</Button>
              </fieldset>
            </form>
        </div>
      )}
    </div>
  )
}
