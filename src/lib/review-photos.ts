import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'
import sharp from 'sharp'

import { rowsOf } from '@/lib/analytics'

const LONGEST_SIDE = 1600
/** A small file can still decode to a huge image; refuse those before using the memory. */
const MAX_INPUT_PIXELS = 40_000_000
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp'])

export class ReviewPhotoFormatError extends Error {
  constructor() {
    super('That file is not a photo we can use. Please choose a JPG, PNG or WebP image.')
  }
}

/**
 * Re-encodes a customer's file rather than storing it as sent. What gets saved
 * is pixels we produced, not whatever the file really contained. Sharp also
 * drops metadata by default, and phone photos carry the GPS position of where
 * they were taken, which is often the customer's home.
 */
export const processReviewPhoto = async (input: Buffer) => {
  try {
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    const { format } = await image.metadata()
    // Sharp can read SVG too, which is a document rather than a photo.
    if (!format || !ACCEPTED_FORMATS.has(format)) throw new ReviewPhotoFormatError()
    const { data, info } = await image
      .rotate()
      .resize(LONGEST_SIDE, LONGEST_SIDE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    return { data, size: info.size }
  } catch {
    throw new ReviewPhotoFormatError()
  }
}

/** Saved under a random name: until its review is approved, only the customer and staff get the URL. */
export const saveReviewPhoto = async (payload: Payload, customerId: number, input: Buffer) => {
  const { data, size } = await processReviewPhoto(input)
  const photo = await payload.create({
    collection: 'review-photos',
    data: { customer: customerId },
    file: { data, mimetype: 'image/webp', name: `${randomUUID()}.webp`, size },
    overrideAccess: true,
  })
  return { id: photo.id, url: photo.url ?? '' }
}

/**
 * Housekeeping for the scheduled job: photos added to a form that was never
 * submitted, or taken off a review later. A day's grace, as a form may still be
 * open. A few at a time, as each one also removes a stored file.
 */
export const deleteUnusedReviewPhotos = async (payload: Payload): Promise<void> => {
  try {
    const rows = await rowsOf(payload, sql`
      SELECT p.id FROM review_photos p
      WHERE p.created_at < now() - interval '1 day'
        AND NOT EXISTS (SELECT 1 FROM reviews_rels r WHERE r.review_photos_id = p.id)
      ORDER BY p.id
      LIMIT 25
    `)
    for (const { id } of rows) {
      await payload.delete({ collection: 'review-photos', id: Number(id), overrideAccess: true })
    }
  } catch (err) {
    // Next run tries again; this mustn't hold up releasing unpaid orders' stock.
    payload.logger.error({ err }, 'Could not delete unused review photos')
  }
}
