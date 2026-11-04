'use client'

import { ImagePlus, X } from 'lucide-react'
import Image from 'next/image'
import { useState, type ChangeEvent } from 'react'

import { MAX_REVIEW_PHOTOS, MAX_REVIEW_PHOTO_BYTES, REVIEW_PHOTO_TYPES } from '@/lib/review-photo-rules'

export type PickedPhoto = { id: number; url: string }

const LONGEST_SIDE = 1600

/**
 * A phone photo can be 10 MB, too big for the upload route and slow on mobile
 * data, so it's shrunk here first. If the browser can't, the original is sent
 * and the server decides.
 */
const shrink = async (file: File): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

/** Optional photos on a review. Each uploads as it's chosen; the review saves their ids. */
export const ReviewPhotoPicker = ({
  productId,
  photos,
  onChange,
}: {
  productId: number
  photos: PickedPhoto[]
  onChange: (photos: PickedPhoto[]) => void
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const room = MAX_REVIEW_PHOTOS - photos.length

  const upload = async (file: File): Promise<PickedPhoto | null> => {
    const shrunk = await shrink(file)
    if (shrunk.size > MAX_REVIEW_PHOTO_BYTES) {
      setError('That photo is too large. Please choose one under 4 MB.')
      return null
    }
    const form = new FormData()
    form.set('productId', String(productId))
    form.set('photo', shrunk, file.name)
    try {
      const response = await fetch('/api/product-reviews/photos', { method: 'POST', body: form })
      const reply: { ok: boolean; photo?: PickedPhoto; error?: string } = await response.json()
      if (reply.ok && reply.photo) return reply.photo
      setError(reply.error ?? 'We could not add that photo. Please try again.')
    } catch {
      setError('We could not add that photo. Please check your connection and try again.')
    }
    return null
  }

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? [])
    // Lets the same file be picked again after a failure or removing it.
    event.target.value = ''
    if (chosen.length === 0) return
    setError(chosen.length > room ? `You can add up to ${MAX_REVIEW_PHOTOS} photos.` : null)
    setUploading(true)
    // One at a time, in the order chosen: phones on slow data shouldn't send five at once.
    let next = photos
    for (const file of chosen.slice(0, room)) {
      const photo = await upload(file)
      if (photo) {
        next = [...next, photo]
        onChange(next)
      }
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body2 font-medium">Photos (optional)</p>
      <p className="text-body3 text-dark-400">
        Add up to {MAX_REVIEW_PHOTOS} real photos of the product. Please avoid faces, addresses and order details.
      </p>
      <ul className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <li key={photo.id} className="relative size-20">
            <Image
              src={photo.url}
              alt={`Your photo ${index + 1}`}
              width={80}
              height={80}
              className="size-20 rounded-lg border border-dark-200 object-cover"
            />
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => onChange(photos.filter((other) => other.id !== photo.id))}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-dark-500 text-light-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {room > 0 && (
          <li>
            <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-dark-300 text-center text-label2 text-dark-400 focus-within:outline-2 focus-within:outline-brand-blue-500 hover:border-brand-blue-500 has-disabled:cursor-wait has-disabled:opacity-60">
              <input
                type="file"
                accept={REVIEW_PHOTO_TYPES}
                multiple
                disabled={uploading}
                onChange={(event) => void choose(event)}
                className="sr-only"
              />
              <ImagePlus className="size-5" aria-hidden />
              {uploading ? 'Adding…' : 'Add photo'}
            </label>
          </li>
        )}
      </ul>
      {error && <p role="alert" className="text-body3 text-brand-red-500">{error}</p>}
    </div>
  )
}
