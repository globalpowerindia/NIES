import { fail, ok } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { guardMutation } from '@/lib/request-security'
import { MAX_REVIEW_PHOTO_BYTES } from '@/lib/review-photo-rules'
import { ReviewPhotoFormatError, saveReviewPhoto } from '@/lib/review-photos'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { canReviewProduct } from '@/lib/storefront/reviews'

const writeLimit = { limit: 40, windowSeconds: 60 * 60 }
/** The photo plus the form fields around it. */
const MAX_BODY_BYTES = MAX_REVIEW_PHOTO_BYTES + 1024
const TOO_LARGE = 'That photo is too large. Please choose one under 4 MB.'

/**
 * One photo for a review the customer is writing. It isn't public from here: it
 * only appears once attached to a review that staff have approved. Only someone
 * who may review this product can upload, so storage is not open to the public.
 */
export const POST = async (request: Request) => {
  const denied = await guardMutation(request, 'reviewPhoto', writeLimit)
  if (denied) return denied
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in to add photos.')

  // Checked before reading the body, as formData() holds all of it in memory.
  const length = Number(request.headers.get('content-length'))
  if (!length) return fail(411, 'We could not read that photo. Please try again.')
  if (length > MAX_BODY_BYTES) return fail(413, TOO_LARGE)

  const form = await request.formData().catch(() => null)
  const file = form?.get('photo')
  const productId = Number(form?.get('productId'))
  if (!(file instanceof File) || !Number.isSafeInteger(productId) || productId <= 0) {
    return fail(422, 'Please choose a photo.')
  }
  if (file.size > MAX_REVIEW_PHOTO_BYTES) return fail(413, TOO_LARGE)

  const payload = await getPayloadClient()
  const allowed = await rateLimit(payload, `reviewPhoto:customer:${customer.id}`, writeLimit)
  if (!allowed.ok) return fail(429, 'You have added too many photos. Please try again later.')

  try {
    if (!(await canReviewProduct(payload, customer.id, productId))) {
      return fail(403, 'You can add photos after your paid order has been delivered.')
    }
    const photo = await saveReviewPhoto(payload, customer.id, Buffer.from(await file.arrayBuffer()))
    return ok({ photo })
  } catch (err) {
    if (err instanceof ReviewPhotoFormatError) return fail(422, err.message)
    payload.logger.error({ err }, 'Review photo upload failed')
    return fail(500, 'We could not save that photo. Please try again.')
  }
}
