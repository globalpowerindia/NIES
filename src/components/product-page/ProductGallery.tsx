'use client'

import { Heart } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import type { MediaInfo } from '@/lib/storefront/content'
import { cn } from '@/lib/utils'

/** Thumbnails down the left, the selected image large on the right. */
export const ProductGallery = ({ images, name }: { images: MediaInfo[]; name: string }) => {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto lg:max-h-[724px] lg:flex-col lg:gap-5 lg:overflow-y-auto" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={index === active}
                className={cn(
                  'relative block h-[88px] w-[83px] overflow-hidden rounded-xl bg-light-100 lg:h-[166px] lg:w-[156px]',
                  index === active ? 'border-[0.5px] border-dark-500' : 'border-[0.5px] border-transparent hover:border-dark-200',
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="156px"
                  className="object-contain p-1.5 lg:p-2"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-[682/724] w-full overflow-hidden rounded-xl bg-light-100 lg:flex-1">
        <Image
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 682px"
          className="object-contain p-[7.5%_7.5%_10%]"
        />
        <button
          type="button"
          aria-label={`Add ${name} to wishlist`}
          className="absolute top-5 right-5 text-dark-500 transition-colors hover:text-brand-red-500"
        >
          <Heart className="size-9 lg:size-[45px]" strokeWidth={1.25} />
        </button>
      </div>
    </div>
  )
}
