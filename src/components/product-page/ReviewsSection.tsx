import { Star } from 'lucide-react'

import { ButtonLink } from '@/components/ui/Button'
import type { ProductPageData } from '@/lib/storefront/product-page'

import { RatingBadge } from './RatingBadge'

const Stars = ({ filled }: { filled: number }) => (
  <span className="flex gap-1" aria-hidden>
    {[1, 2, 3, 4, 5].map((index) => (
      <Star
        key={index}
        className={index <= filled ? 'size-[18px] fill-green-400 stroke-green-400' : 'size-[18px] stroke-green-400'}
        strokeWidth={1.5}
      />
    ))}
  </span>
)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })

export const ReviewsSection = ({ data, loginHref }: { data: ProductPageData; loginHref: string }) => {
  const { rating, reviews } = data
  const total = rating.distribution.reduce((sum, row) => sum + row.count, 0)

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="flex scroll-mt-6 flex-col gap-6">
      <h2 id="reviews-heading" className="text-h5 font-medium text-dark-500">
        Rating &amp; Reviews
      </h2>

      <div className="flex flex-col gap-6 py-4">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center gap-1 self-center md:self-auto">
            <p className="flex items-center py-1 pr-4 pl-2">
              <Star className="size-[59px] fill-green-400 stroke-green-400" aria-hidden />
              <span className="text-h2 font-semibold text-dark-500">{rating.count ? rating.average.toFixed(1) : 0}</span>
            </p>
            <p className="text-h6 font-medium text-dark-400">
              {rating.count ? `${rating.count} review${rating.count === 1 ? '' : 's'}` : 'No reviews yet'}
            </p>
          </div>

          <ul className="flex flex-col justify-center gap-2" aria-label="Rating breakdown">
            {rating.distribution.map((row) => {
              const percent = total ? Math.round((row.count / total) * 100) : 0
              return (
                <li key={row.stars} className="flex items-center gap-3">
                  <span className="sr-only">{row.stars} stars:</span>
                  <Stars filled={row.stars} />
                  <span className="relative h-3 w-full min-w-24 bg-[#d9d9d9] md:w-[353px]">
                    <span className="absolute inset-y-0 left-0 bg-green-400" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="w-12 text-h6 font-medium text-dark-400">{percent}%</span>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col justify-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-h6 font-semibold text-dark-500">Review this product</p>
              <p className="text-body1 text-dark-300">Share your thoughts with other customers</p>
            </div>
            <ButtonLink href={loginHref} variant="blue" className="h-[50px] w-[228px]">
              Write a Review
            </ButtonLink>
          </div>
        </div>

        {reviews.length > 0 && (
          <>
            <hr className="border-t-[0.5px] border-dark-200" />
            <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex w-[85vw] max-w-[691px] shrink-0 snap-start flex-col gap-7 rounded-2xl border-[0.5px] border-brand-blue-200 bg-light-500 p-6"
                >
                  <div className="flex items-center justify-between gap-7">
                    <RatingBadge value={review.rating} className="text-body2" />
                    {review.verifiedPurchase && (
                      <span className="flex items-center gap-1 text-label2 text-dark-400">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icons/verified.svg" alt="" width={20} height={20} className="size-5" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-5 text-dark-400">
                    {review.title && <p className="text-h6 font-semibold">{review.title}</p>}
                    {review.body && <p className="text-label1">{review.body}</p>}
                  </div>
                  <div className="mt-auto flex items-start gap-2">
                    <span
                      aria-hidden
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-blue-400 text-body1 font-medium text-light-100"
                    >
                      {review.authorName.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-h6 font-semibold text-dark-400">{review.authorName}</span>
                      <time dateTime={review.date} className="text-label2 text-dark-300">
                        {formatDate(review.date)}
                      </time>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
