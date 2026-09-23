import type { Category, Datasheet, Media, Product } from '@/payload-types'

export type MediaInfo = { url: string; alt: string; width?: number; height?: number }

/** An upload field is an id until populated; only a populated doc has a URL. */
export const mediaOf = (value: unknown): MediaInfo | null => {
  if (!value || typeof value !== 'object') return null
  const media = value as Media
  if (!media.url) return null
  return {
    url: media.url,
    alt: media.alt ?? '',
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  }
}

export const fileUrlOf = (value: unknown): string | null =>
  value && typeof value === 'object' ? ((value as Datasheet).url ?? null) : null

export type LinkValue = {
  type?: 'category' | 'product' | 'custom' | 'none' | null
  category?: number | Category | null
  product?: number | Product | null
  url?: string | null
} | null | undefined

/** Resolves a link field to a path. Unpopulated or unpublished targets give null, never a broken URL. */
export const hrefOf = (link: LinkValue): string | null => {
  if (!link) return null
  switch (link.type) {
    case 'category':
      return typeof link.category === 'object' && link.category?.slug ? `/category/${link.category.slug}` : null
    case 'product':
      return typeof link.product === 'object' && link.product?.slug ? `/products/${link.product.slug}` : null
    case 'custom':
      return link.url?.trim() || null
    default:
      return null
  }
}

export type BannerData = {
  image: MediaInfo
  mobileImage: MediaInfo | null
  href: string | null
  overlay: {
    heading?: string
    subheading?: string
    buttonLabel?: string
    buttonStyle: 'red' | 'blue' | 'outline'
    position: 'left' | 'right'
    textTone: 'light' | 'dark'
    shade: boolean
  } | null
}

type BannerInput = {
  image?: unknown
  mobileImage?: unknown
  link?: LinkValue
  overlay?: {
    heading?: string | null
    subheading?: string | null
    buttonLabel?: string | null
    buttonStyle?: 'red' | 'blue' | 'outline' | null
    position?: 'left' | 'right' | null
    textTone?: 'light' | 'dark' | null
    shade?: boolean | null
  } | null
}

export const bannerOf = (input: BannerInput | null | undefined): BannerData | null => {
  const image = mediaOf(input?.image)
  if (!image) return null
  const overlay = input?.overlay
  const hasOverlay = Boolean(overlay?.heading || overlay?.subheading || overlay?.buttonLabel)
  return {
    image,
    mobileImage: mediaOf(input?.mobileImage),
    href: hrefOf(input?.link),
    overlay: hasOverlay
      ? {
          heading: overlay?.heading ?? undefined,
          subheading: overlay?.subheading ?? undefined,
          buttonLabel: overlay?.buttonLabel ?? undefined,
          buttonStyle: overlay?.buttonStyle ?? 'red',
          position: overlay?.position ?? 'left',
          textTone: overlay?.textTone ?? 'light',
          shade: Boolean(overlay?.shade),
        }
      : null,
  }
}

export const isBanner = (value: BannerData | null): value is BannerData => value !== null
