import Image from 'next/image'

import type { MediaInfo } from '@/lib/storefront/content'

/** Wide enough to fill a banner tile with only a little trimmed from the edges. */
const isBannerShaped = ({ width, height }: MediaInfo) =>
  Boolean(width && height && width / height >= 1.4)

/**
 * Any number of supplier images, stacked as full-width banners under the
 * brochure, in its shape. Artwork fills its tile; a square photo shows whole,
 * as these often carry small print. Each opens at full size.
 */
export const SupplierImages = ({ images, name }: { images: MediaInfo[]; name: string }) => (
  <ul className="flex flex-col gap-3 lg:gap-4">
    {images.map((image, index) => (
      <li key={image.url}>
        <a
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open image ${index + 1} of ${name} at full size`}
          className="relative block aspect-[358/177] overflow-hidden rounded-xl bg-light-100 shadow-[0_4px_16px_#1c1c1c1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red-500 lg:aspect-[1620/601] lg:rounded-3xl"
        >
          <Image
            src={image.url}
            alt={image.alt || ''}
            fill
            sizes="(max-width: 1024px) 100vw, 1000px"
            className={isBannerShaped(image) ? 'object-cover' : 'object-contain'}
          />
        </a>
      </li>
    ))}
  </ul>
)
