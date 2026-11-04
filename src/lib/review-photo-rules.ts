/** Limits shared by the review form and the server. Free of server code. */

export const MAX_REVIEW_PHOTOS = 5

/** Under what a Vercel function accepts (4.5 MB). The form shrinks photos well below this first. */
export const MAX_REVIEW_PHOTO_BYTES = 4 * 1024 * 1024

export const REVIEW_PHOTO_TYPES = 'image/jpeg,image/png,image/webp'
