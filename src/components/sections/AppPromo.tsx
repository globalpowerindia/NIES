import Image from 'next/image'
import type { CSSProperties } from 'react'

import type { MediaInfo } from '@/lib/storefront/content'

export type AppPromoProps = {
  title?: string
  description?: string
  screenshot: MediaInfo | null
  googlePlayUrl?: string | null
  appStoreUrl?: string | null
}

/**
 * The hand-held phone mockup from the Figma frame (1620 × 500). Each layer
 * keeps the design's inset box, rotation and skew; sizes use container units
 * so the whole mockup scales with the banner. Only the screen is content:
 * it's the app screenshot uploaded in the admin.
 */
type Layer = {
  inset: string
  width: string
  height: string
  rotate: number
  skew: number
}

const HAND: Layer = {
  inset: '12.72% 10.15% -31.26% 57.88%',
  width: 'hypot(84.807cqw, 15.557cqh)',
  height: 'hypot(-15.193cqw, 84.443cqh)',
  rotate: 11.86,
  skew: 2.92,
}
const PHONE: Layer = {
  inset: '6.54% 22.29% 12.18% 58.7%',
  width: 'hypot(81.9617cqw, 13.0409cqh)',
  height: 'hypot(-18.0383cqw, 86.9591cqh)',
  rotate: 11.86,
  skew: 2.92,
}
const SCREEN_BACK: Layer = {
  inset: '7.48% 22.56% 14.95% 59.24%',
  width: 'hypot(83.9322cqw, 14.7025cqh)',
  height: 'hypot(-16.0678cqw, 85.2975cqh)',
  rotate: 12.98,
  skew: 4.83,
}
const SCREEN: Layer = {
  inset: '6.2% 22% 12.82% 58.7%',
  width: 'hypot(85.37cqw, 16.143cqh)',
  height: 'hypot(-14.63cqw, 83.857cqh)',
  rotate: 13.76,
  skew: 6.08,
}

const layerBox = (layer: Layer): CSSProperties => ({ inset: layer.inset, containerType: 'size' })
const layerBody = (layer: Layer): CSSProperties => ({
  width: layer.width,
  height: layer.height,
  transform: `rotate(${layer.rotate}deg) skewX(${layer.skew}deg)`,
})

// The screen mask is 298.7 × 387.9 at offset 6.8 / 6.4 on a 274.3 × 342.1
// screen in the design; expressed in percentages so it scales with the layer.
const SCREEN_MASK: CSSProperties = {
  maskImage: 'url(/app-promo/screen-mask.svg)',
  maskSize: '108.9% 113.4%',
  maskPosition: '-28.4% -13.9%',
  maskRepeat: 'no-repeat',
  maskMode: 'luminance',
}

const StoreBadge = ({
  href,
  label,
  crop,
}: {
  href: string
  label: string
  crop: { width: string; height: string; left: string; top: string }
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="relative block h-[40px] w-[127px] shrink-0 overflow-hidden rounded-[6px] transition-opacity hover:opacity-90 md:h-[58px] md:w-[184px] md:rounded-[9px]"
  >
    <Image
      src="/app-promo/store-badges.png"
      alt=""
      width={4096}
      height={2304}
      sizes="600px"
      className="absolute max-w-none"
      style={{ width: crop.width, height: crop.height, left: crop.left, top: crop.top }}
    />
  </a>
)

export const AppPromo = ({ title, description, screenshot, googlePlayUrl, appStoreUrl }: AppPromoProps) => (
  <section className="relative overflow-hidden rounded-2xl bg-brand-blue-500 lg:aspect-[1620/500]">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.02]"
      style={{ backgroundImage: 'url(/app-promo/pattern.png)', backgroundSize: '1024px 1024px' }}
    />

    {screenshot && (
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute flex items-center justify-center" style={layerBox(HAND)}>
          <div className="relative flex-none overflow-hidden" style={layerBody(HAND)}>
            <Image
              src="/app-promo/hand.png"
              alt=""
              width={2292}
              height={1945}
              sizes="560px"
              className="absolute top-[-0.02%] left-[-0.02%] h-full w-[111.08%] max-w-none"
            />
          </div>
        </div>
        <div className="absolute flex items-center justify-center" style={layerBox(PHONE)}>
          <div className="relative flex-none" style={layerBody(PHONE)}>
            <Image src="/app-promo/iphone.png" alt="" fill sizes="300px" />
          </div>
        </div>
        <div className="absolute flex items-center justify-center" style={layerBox(SCREEN_BACK)}>
          <div className="relative flex-none" style={layerBody(SCREEN_BACK)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG shape, no optimisation to gain */}
            <img src="/app-promo/phone-mask.svg" alt="" className="absolute inset-0 block size-full max-w-none" />
          </div>
        </div>
        <div className="absolute flex items-center justify-center" style={layerBox(SCREEN)}>
          <div className="relative flex-none" style={{ ...layerBody(SCREEN), ...SCREEN_MASK }}>
            <Image src={screenshot.url} alt="" fill sizes="300px" className="object-cover" />
          </div>
        </div>
      </div>
    )}

    <div className="relative flex flex-col items-center gap-5 px-8 pt-[62px] pb-[62px] text-center md:items-start md:py-16 md:text-left lg:absolute lg:top-[22.8%] lg:left-[15.56%] lg:w-[38.5%] lg:p-0">
      <div className="flex flex-col gap-6">
        {title && <h2 className="text-h5 font-semibold text-light-100 md:text-h3 md:font-medium xl:text-title3">{title}</h2>}
        {description && <p className="text-body3 text-brand-blue-200 md:text-body1">{description}</p>}
      </div>
      {(googlePlayUrl || appStoreUrl) && (
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start md:gap-3">
          {googlePlayUrl && (
            <StoreBadge
              href={googlePlayUrl}
              label="Get it on Google Play"
              crop={{ width: '311.68%', height: '550.63%', left: '-158.65%', top: '-225.04%' }}
            />
          )}
          {appStoreUrl && (
            <StoreBadge
              href={appStoreUrl}
              label="Download on the App Store"
              crop={{ width: '312.25%', height: '547.99%', left: '-53.22%', top: '-223.4%' }}
            />
          )}
        </div>
      )}
    </div>
  </section>
)
