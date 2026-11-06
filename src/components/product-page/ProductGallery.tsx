'use client'

import { Hand, Play, Rotate3d, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type PointerEvent } from 'react'

import { ProductImageViewer } from '@/components/product-page/ProductImageViewer'
import { ProductSpin } from '@/components/product-page/ProductSpin'
import { ShareButton } from '@/components/product-page/ShareButton'
import { WishlistHeart } from '@/components/wishlist/WishlistHeart'
import type { MediaInfo } from '@/lib/storefront/content'
import type { GalleryVideo, ProductSpinData } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

const ProductModel = dynamic(() => import('./ProductModel').then((module) => module.ProductModel), {
  ssr: false,
})

const GALLERY_SIZES = '(max-width: 1024px) 100vw, 682px'
const IMAGE_CLASS =
  'object-contain px-[min(13.8%,3.125rem)] pt-[2.125rem] pb-2 lg:p-[7.5%_7.5%_10%]'
const HOVER_SCALE = 2.5

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
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-label3 text-dark-500">
        <Rotate3d className="size-6" aria-hidden />
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
          <span className="flex items-center gap-1 rounded-full bg-dark-500/75 px-1.5 py-0.5 text-[0.625rem] font-semibold text-light-100 lg:text-label3">
            <Rotate3d className="size-3" aria-hidden />
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

/**
 * The main photo: magnifies under a mouse in place, and opens the full-screen
 * viewer on click or tap. Touch never magnifies here, so the page still scrolls.
 */
const HoverZoomImage = ({
  image,
  name,
  onOpen,
  priority = false,
}: {
  image: MediaInfo
  name: string
  onOpen: () => void
  /** Only the photo seen first is worth fetching before the rest of the page. */
  priority?: boolean
}) => {
  const layer = useRef<HTMLSpanElement>(null)
  const [hovering, setHovering] = useState(false)
  // Fetched on first hover: the page's own copy is too soft at this size.
  const [wantsSharp, setWantsSharp] = useState(false)
  const [sharpLoaded, setSharpLoaded] = useState(false)
  const alt = image.alt || name

  // Written straight to the element: the cursor moves too often to re-render for.
  const follow = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse' || !layer.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    layer.current.style.transformOrigin = `${x}% ${y}%`
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return
        follow(event)
        setHovering(true)
        setWantsSharp(true)
      }}
      onPointerMove={follow}
      onPointerLeave={() => setHovering(false)}
      aria-label={`Zoom in on ${alt}`}
      className="absolute inset-0 block cursor-zoom-in focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-inset focus-visible:outline-none"
    >
      <span
        ref={layer}
        className="absolute inset-0 block"
        style={{ transform: hovering ? `scale(${HOVER_SCALE})` : undefined }}
      >
        <Image
          src={image.url}
          alt={alt}
          fill
          preload={priority}
          sizes={GALLERY_SIZES}
          className={IMAGE_CLASS}
        />
        {wantsSharp && (
          <Image
            src={image.url}
            alt=""
            fill
            sizes="1800px"
            onLoad={() => setSharpLoaded(true)}
            className={cn(IMAGE_CLASS, !sharpLoaded && 'opacity-0')}
          />
        )}
      </span>
      <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-light-100/90 text-dark-500 shadow-sm lg:bottom-5 lg:left-5 lg:size-11">
        <ZoomIn className="size-4 lg:size-5" aria-hidden />
      </span>
    </button>
  )
}

const keyOf = (item: Item) =>
  item.kind === 'image'
    ? item.image.url
    : item.kind === 'spin'
      ? 'spin'
      : item.kind === 'youtube'
        ? item.id
        : item.url

const labelOf = (item: Item, index: number, count: number) =>
  item.kind === 'image'
    ? `Show image ${index + 1} of ${count}`
    : item.kind === 'spin'
      ? 'Show the 360° view'
      : item.kind === 'model'
        ? 'Show the 3D model'
        : `Play video: ${item.title}`

/** The laptop layout: one item at a time, picked from the thumbnails. */
const useWideScreen = () => {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 64rem)')
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

/**
 * Stands in for the 3D and 360° views on a phone until tapped. Both turn the
 * product when dragged, which would otherwise trap a swipe to the next slide.
 */
const TapToView = ({ item, onTap }: { item: Item; onTap: () => void }) => (
  <button
    type="button"
    onClick={onTap}
    className="absolute inset-0 block bg-light-100 focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-inset focus-visible:outline-none"
  >
    <Thumb item={item} />
    <span className="absolute inset-x-0 bottom-4 flex justify-center">
      <span className="flex items-center gap-1.5 rounded-full bg-dark-500/80 px-3 py-1.5 text-body3 font-medium text-light-100">
        <Hand className="size-4" aria-hidden />
        {item.kind === 'model' ? 'Tap to turn the 3D model' : 'Tap to turn it 360°'}
      </span>
    </span>
  </button>
)

/** Share and wishlist, matching the round zoom button in the opposite corner. */
const CORNER_BUTTON =
  'grid size-9 place-items-center rounded-full bg-light-100/90 shadow-sm lg:size-11'

/** Thumbnails down the left with the chosen item large beside them; on a phone, a swipeable row with dots. */
export const ProductGallery = ({
  productId,
  images,
  videos = [],
  spin = null,
  modelUrl = null,
  name,
  description,
}: {
  productId: number
  images: MediaInfo[]
  videos?: GalleryVideo[]
  spin?: ProductSpinData | null
  modelUrl?: string | null
  name: string
  description: string
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
  const [viewing, setViewing] = useState<number | null>(null)
  // On a phone, the 3D or 360° view the shopper tapped into; swiping away puts it back.
  const [engaged, setEngaged] = useState<number | null>(null)
  const wide = useWideScreen()
  const track = useRef<HTMLDivElement>(null)

  // A thumbnail, a dot or the full-screen viewer moved to another item: bring its slide into view.
  useEffect(() => {
    const element = track.current
    if (!element || wide || !element.clientWidth) return
    if (Math.round(element.scrollLeft / element.clientWidth) !== active) {
      element.scrollTo({ left: active * element.clientWidth })
    }
  }, [active, wide])

  const onSwipe = () => {
    const element = track.current
    if (!element || wide || !element.clientWidth) return
    const index = Math.round(element.scrollLeft / element.clientWidth)
    if (index !== active) {
      setActive(index)
      setEngaged(null)
    }
  }

  const slide = (item: Item, index: number) => {
    const isActive = index === active
    if (item.kind === 'image') {
      return (
        <HoverZoomImage
          image={item.image}
          name={name}
          priority={index === 0}
          onOpen={() => setViewing(images.indexOf(item.image))}
        />
      )
    }
    // Heavy or interactive: only the item on show is loaded.
    if (!isActive) return <Thumb item={item} />
    if (item.kind === 'model' || item.kind === 'spin') {
      if (!wide && engaged !== index)
        return <TapToView item={item} onTap={() => setEngaged(index)} />
      return item.kind === 'model' ? (
        <ProductModel key={item.url} src={item.url} name={name} />
      ) : (
        <ProductSpin spin={item.spin} name={name} />
      )
    }
    if (item.kind === 'youtube') {
      return (
        <div className="absolute inset-0 grid place-items-center bg-dark-500">
          <iframe
            key={item.id}
            src={`https://www.youtube-nocookie.com/embed/${item.id}?rel=0`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      )
    }
    return (
      <video
        key={item.url}
        controls
        playsInline
        preload="metadata"
        aria-label={item.title}
        className="absolute inset-0 size-full bg-dark-500 object-contain"
      >
        <source src={item.url} type={item.mimeType} />
      </video>
    )
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-3">
      {items.length > 1 && (
        <ul
          className="order-first hidden max-h-[45.25rem] shrink-0 flex-col gap-2 overflow-y-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden"
          aria-label="Product images and videos"
        >
          {items.map((item, index) => (
            <li key={keyOf(item)} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={labelOf(item, index, items.length)}
                aria-pressed={index === active}
                className={cn(
                  'relative block size-[5rem] overflow-hidden rounded-lg bg-light-100',
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

      <div className="flex min-w-0 flex-col gap-3 lg:flex-1">
        <div className="relative h-[18.6875rem] w-full overflow-hidden rounded-xl bg-light-100 lg:aspect-[682/724] lg:h-auto">
          {!current ? (
            <span className="grid h-full place-items-center text-body3 text-dark-300">
              No product image available
            </span>
          ) : (
            // Phones swipe through every item; from laptop width only the chosen one shows.
            <div
              ref={track}
              onScroll={onSwipe}
              aria-roledescription={wide ? undefined : 'carousel'}
              aria-label={wide ? undefined : 'Product images and videos'}
              className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:block lg:overflow-hidden [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item, index) => (
                <div
                  key={keyOf(item)}
                  aria-roledescription={wide ? undefined : 'slide'}
                  aria-label={wide ? undefined : `${index + 1} of ${items.length}`}
                  className={cn(
                    'relative h-full w-full shrink-0 snap-center lg:h-full',
                    index === active ? 'lg:block' : 'lg:hidden',
                  )}
                >
                  {slide(item, index)}
                </div>
              ))}
            </div>
          )}
          {(current?.kind === 'image' || current?.kind === 'spin' || current?.kind === 'model') && (
            <div className="absolute top-3 right-3 flex items-center gap-2 lg:top-5 lg:right-5">
              <ShareButton
                name={name}
                description={description}
                className={CORNER_BUTTON}
                iconClassName="size-4 lg:size-6"
              />
              <WishlistHeart
                productId={productId}
                label={name}
                className={CORNER_BUTTON}
                iconClassName="size-4 lg:size-6"
              />
            </div>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 lg:hidden">
            {items.map((item, index) => (
              <button
                key={keyOf(item)}
                type="button"
                onClick={() => {
                  setActive(index)
                  setEngaged(null)
                }}
                aria-label={labelOf(item, index, items.length)}
                aria-current={index === active ? 'true' : undefined}
                className="grid h-6 place-items-center px-0.5"
              >
                <span
                  className={cn(
                    'block h-2 rounded-full transition-all',
                    index === active ? 'w-5 bg-dark-500' : 'w-2 bg-dark-200',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {viewing !== null && (
        <ProductImageViewer
          images={images}
          name={name}
          startIndex={viewing}
          onClose={(index) => {
            setViewing(null)
            setActive(
              items.findIndex((item) => item.kind === 'image' && item.image === images[index]),
            )
          }}
        />
      )}
    </div>
  )
}
