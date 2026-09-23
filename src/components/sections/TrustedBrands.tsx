import Image from 'next/image'

import type { MediaInfo } from '@/lib/storefront/content'

export type TrustedBrand = { name: string; logo: MediaInfo }

export type TrustedBrandsProps = {
  title: string
  description?: string
  brands: TrustedBrand[]
}

const LOGO_HEIGHT = 74
const LOGO_MAX_WIDTH = 200

export const TrustedBrands = ({ title, description, brands }: TrustedBrandsProps) => {
  if (brands.length === 0) return null
  return (
    <section className="flex flex-col items-center gap-12 py-20 lg:flex-row lg:gap-[182px]">
      <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[450px]">
        <h2 className="max-w-[300px] text-h3 font-medium text-dark-500">{title}</h2>
        {description && <p className="text-body3 text-dark-400">{description}</p>}
      </div>

      <div className="relative h-[95px] w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <ul className="absolute flex h-full animate-marquee items-center gap-[88px] will-change-transform">
          {[...brands, ...brands].map((brand, index) => {
            const ratio = brand.logo.width && brand.logo.height ? brand.logo.width / brand.logo.height : 2
            // Wide wordmarks would otherwise dominate the strip; contain them in a box.
            const width = Math.min(Math.round(LOGO_HEIGHT * ratio), LOGO_MAX_WIDTH)
            return (
              <li key={`${brand.name}-${index}`} className="shrink-0">
                <Image
                  src={brand.logo.url}
                  alt={index < brands.length ? brand.name : ''}
                  width={width}
                  height={LOGO_HEIGHT}
                  style={{ width, height: LOGO_HEIGHT }}
                  className="object-contain"
                />
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
