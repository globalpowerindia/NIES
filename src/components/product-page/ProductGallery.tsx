'use client'

import { Play } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { WishlistHeart } from '@/components/wishlist/WishlistHeart'
import type { MediaInfo } from '@/lib/storefront/content'
import type { GalleryVideo } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

type Item = { kind: 'image'; image: MediaInfo } | GalleryVideo

const PlayBadge = () => (
  <span className="absolute inset-0 grid place-items-center">
    <span className="grid size-10 place-items-center rounded-full bg-dark-500/70 text-light-100 lg:size-12">
      <Play className="size-5 translate-x-px fill-current lg:size-6" aria-hidden />
    </span>
  </span>
)

const Thumb = ({ item }: { item: Item }) => {
  if (item.kind === 'image') {
    return (
      <Image
        src={item.image.url}
        alt=""
        fill
        sizes="156px"
        className="object-contain p-1.5 lg:p-2"
      />
    )
  }
  return (
    <>
      {item.kind === 'youtube' ? (
        // YouTube's own still; next/image would need YouTube's host allowed for no gain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <span className="block size-full bg-dark-500" />
      )}
      <PlayBadge />
    </>
  )
}

/** Thumbnails down the left, the selected image or video large on the right. */
export const ProductGallery = ({
  productId,
  images,
  videos = [],
  name,
}: {
  productId: number
  images: MediaInfo[]
  videos?: GalleryVideo[]
  name: string
}) => {
  const items: Item[] = [...images.map((image) => ({ kind: 'image' as const, image })), ...videos]
  const [active, setActive] = useState(0)
  const current = items[active] ?? items[0]

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {items.length > 1 && (
        <ul
          className="flex gap-3 overflow-x-auto lg:max-h-[724px] lg:flex-col lg:gap-5 lg:overflow-y-auto"
          aria-label="Product images and videos"
        >
          {items.map((item, index) => (
            <li
              key={
                item.kind === 'image'
                  ? item.image.url
                  : item.kind === 'youtube'
                    ? item.id
                    : item.url
              }
              className="shrink-0"
            >
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={
                  item.kind === 'image'
                    ? `Show image ${index + 1} of ${items.length}`
                    : `Play video: ${item.title}`
                }
                aria-pressed={index === active}
                className={cn(
                  'relative block h-[88px] w-[83px] overflow-hidden rounded-xl bg-light-100 lg:h-[166px] lg:w-[156px]',
                  index === active
                    ? 'border-[0.5px] border-dark-500'
                    : 'border-[0.5px] border-transparent hover:border-dark-200',
                )}
              >
                <Thumb item={item} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-[682/724] w-full overflow-hidden rounded-xl bg-light-100 lg:flex-1">
        {current.kind === 'image' ? (
          <Image
            src={current.image.url}
            alt={current.image.alt || name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 682px"
            className="object-contain p-[7.5%_7.5%_10%]"
          />
        ) : current.kind === 'youtube' ? (
          <div className="absolute inset-0 grid place-items-center bg-dark-500">
            <iframe
              key={current.id}
              src={`https://www.youtube-nocookie.com/embed/${current.id}?rel=0`}
              title={current.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
        ) : (
          <video
            key={current.url}
            controls
            playsInline
            preload="metadata"
            aria-label={current.title}
            className="absolute inset-0 size-full bg-dark-500 object-contain"
          >
            <source src={current.url} type={current.mimeType} />
          </video>
        )}
        {current.kind === 'image' && (
          <WishlistHeart
            productId={productId}
            label={name}
            className="absolute top-5 right-5"
            iconClassName="size-9 lg:size-[45px]"
            strokeWidth={1.25}
          />
        )}
      </div>
    </div>
  )
}
