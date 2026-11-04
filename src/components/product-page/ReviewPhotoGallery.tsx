'use client'

import Image from 'next/image'
import { useState } from 'react'

import { ProductImageViewer } from '@/components/product-page/ProductImageViewer'
import type { MediaInfo } from '@/lib/storefront/content'

/** A review's photos as thumbnails, opening full screen with the product gallery's zoom. */
export const ReviewPhotoGallery = ({ photos, author }: { photos: MediaInfo[]; author: string }) => {
  const [viewing, setViewing] = useState<number | null>(null)
  const name = `Photo from ${author}'s review`

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <li key={photo.url}>
            <button
              type="button"
              aria-label={`Open ${name.toLowerCase()}, ${index + 1} of ${photos.length}`}
              onClick={() => setViewing(index)}
              className="block overflow-hidden rounded-lg border-[0.5px] border-brand-blue-200 transition-opacity hover:opacity-80"
            >
              <Image src={photo.url} alt="" width={88} height={88} className="size-[5.5rem] object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {viewing !== null && (
        <ProductImageViewer images={photos} name={name} startIndex={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  )
}
