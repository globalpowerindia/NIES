import Image from 'next/image'

import type { MediaInfo } from '@/lib/storefront/content'
import { cn } from '@/lib/utils'

/**
 * Any number of supplier images, as an even grid. They often carry small print,
 * so each opens at full size. One image takes the full width, two sit side by side.
 */
export const SupplierImages = ({ images, name }: { images: MediaInfo[]; name: string }) => (
  <ul
    className={cn(
      'grid gap-3 lg:gap-4',
      images.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
      images.length > 2 && 'lg:grid-cols-3',
    )}
  >
    {images.map((image, index) => (
      <li key={image.url}>
        <a
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open image ${index + 1} of ${name} at full size`}
          className={cn(
            'relative block overflow-hidden rounded-xl border-[0.5px] border-dark-100 bg-light-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red-500',
            images.length === 1 ? 'aspect-[16/9]' : 'aspect-square',
          )}
        >
          <Image
            src={image.url}
            alt={image.alt || ''}
            fill
            sizes="(max-width: 1024px) 50vw, 400px"
            className="object-contain"
          />
        </a>
      </li>
    ))}
  </ul>
)
