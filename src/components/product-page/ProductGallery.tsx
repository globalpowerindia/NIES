'use client'

import { Play, Rotate3d } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useState } from 'react'

import { ProductSpin } from '@/components/product-page/ProductSpin'
import { WishlistHeart } from '@/components/wishlist/WishlistHeart'
import type { MediaInfo } from '@/lib/storefront/content'
import type { GalleryVideo, ProductSpinData } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

const ProductModel = dynamic(() => import('./ProductModel').then((module) => module.ProductModel), {
  ssr: false,
})

type Item =
  | { kind: 'model'; url: string }
  | { kind: 'image'; image: MediaInfo }
  | { kind: 'spin'; spin: ProductSpinData }
  | GalleryVideo

const PlayBadge = () => (
  <span className="absolute inset-0 grid place-items-center">
    <span className="grid size-10 place-items-center rounded-full bg-dark-500/70 text-light-100 lg:size-12">
      <Play className="size-5 translate-x-px fill-current lg:size-6" aria-hidden />
    </span>
  </span>
)

const Thumb = ({ item }: { item: Item }) => {
  if (item.kind === 'model')
    return (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-dark-500">
        <Rotate3d className="size-8" aria-hidden />
        3D
      </span>
    )
  if (item.kind === 'spin') {
    return (
      <>
        <Image
          src={item.spin.frames[0].src}
          alt=""
          fill
          sizes="156px"
          className="object-contain p-1.5 opacity-60 lg:p-2"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex items-center gap-1 rounded-full bg-dark-500/75 px-2 py-1 text-[0.75rem] font-semibold text-light-100 lg:px-2.5 lg:text-body3">
            <Rotate3d className="size-3.5 lg:size-4" aria-hidden />
            360°
          </span>
        </span>
      </>
    )
  }
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
  spin = null,
  modelUrl = null,
  name,
}: {
  productId: number
  images: MediaInfo[]
  videos?: GalleryVideo[]
  spin?: ProductSpinData | null
  modelUrl?: string | null
  name: string
}) => {
  const imageItems: Item[] = images.map((image) => ({ kind: 'image' as const, image }))
  // Right after the main photo, where it's seen before scrolling the thumbnails.
  const items: Item[] = [
    ...imageItems.slice(0, 1),
    ...(modelUrl ? [{ kind: 'model' as const, url: modelUrl }] : []),
    ...(spin ? [{ kind: 'spin' as const, spin }] : []),
    ...imageItems.slice(1),
    ...videos,
  ]
  const [active, setActive] = useState(0)
  const current = items[active] ?? items[0]

  return (
    <div className="flex flex-col-reverse gap-[0.8125rem] lg:flex-row lg:gap-4">
      {items.length > 1 && (
        <ul
          className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:max-h-[45.25rem] lg:flex-col lg:gap-5 lg:overflow-y-auto"
          aria-label="Product images and videos"
        >
          {items.map((item, index) => (
            <li
              key={
                item.kind === 'image'
                  ? item.image.url
                  : item.kind === 'spin'
                    ? 'spin'
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
                    : item.kind === 'spin'
                      ? 'Show the 360° view'
                      : item.kind === 'model'
                        ? 'Show the 3D model'
                        : `Play video: ${item.title}`
                }
                aria-pressed={index === active}
                className={cn(
                  'relative block h-[5.375rem] w-[5.125rem] overflow-hidden rounded-xl bg-light-100 lg:h-[10.375rem] lg:w-[9.75rem]',
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

      <div className="relative h-[18.6875rem] w-full overflow-hidden rounded-xl bg-light-100 lg:aspect-[682/724] lg:h-auto lg:flex-1">
        {!current ? (
          <span className="grid h-full place-items-center text-body3 text-dark-300">
            No product image available
          </span>
        ) : current.kind === 'image' ? (
          <Image
            src={current.image.url}
            alt={current.image.alt || name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 682px"
            className="object-contain px-[min(13.8%,3.125rem)] pt-[2.125rem] pb-2 lg:p-[7.5%_7.5%_10%]"
          />
        ) : current.kind === 'model' ? (
          <ProductModel key={current.url} src={current.url} name={name} />
        ) : current.kind === 'spin' ? (
          <ProductSpin spin={current.spin} name={name} />
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
        {(current?.kind === 'image' || current?.kind === 'spin' || current?.kind === 'model') && (
          <WishlistHeart
            productId={productId}
            label={name}
            className="absolute top-3 right-3 lg:top-5 lg:right-5"
            iconClassName="size-5 lg:size-[2.8125rem]"
            strokeWidth={1.25}
          />
        )}
      </div>
    </div>
  )
}
