import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { guardMutation } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { canReviewProduct, ownReview, ReviewEligibilityError, submitReview } from '@/lib/storefront/reviews'
import { reviewSchema } from '@/lib/validations/reviews'

const writeLimit = { limit: 10, windowSeconds: 60 * 60 }

export const GET = async (request: Request) => {
  const productId = Number(new URL(request.url).searchParams.get('productId'))
  if (!Number.isSafeInteger(productId) || productId <= 0) return fail(400, 'Invalid product.')
  const customer = await getCurrentCustomer()
  if (!customer) return ok({ signedIn: false, review: null })
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'reviews',
    where: { and: [{ customer: { equals: customer.id } }, { product: { equals: productId } }] },
    limit: 1, depth: 0, overrideAccess: true,
  })
  return ok({ signedIn: true, eligible: await canReviewProduct(payload, customer.id, productId), review: docs[0] ? ownReview(docs[0]) : null })
}

export const POST = async (request: Request) => {
  const denied = await guardMutation(request, 'reviewWrite', writeLimit)
  if (denied) return denied
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in to write a review.')
  const parsed = reviewSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)
  const payload = await getPayloadClient()
  const allowed = await rateLimit(payload, `reviewWrite:customer:${customer.id}`, writeLimit)
  if (!allowed.ok) return fail(429, 'You have submitted too many reviews. Please try again later.')
  try {
    const review = await submitReview(payload, customer, parsed.data)
    return review ? ok({ review }) : fail(404, 'That product is no longer available.')
  } catch (err) {
    if (err instanceof ReviewEligibilityError) return fail(403, err.message)
    payload.logger.error({ err }, 'Review submission failed')
    return fail(500, 'We could not save your review. Please try again.')
  }
}
