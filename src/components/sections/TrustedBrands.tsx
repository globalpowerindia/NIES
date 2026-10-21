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
    <section className="flex flex-col items-center gap-10 pt-10 pb-4 md:gap-12 md:py-20 lg:flex-row lg:gap-[11.375rem]">
      <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[28.125rem]">
        <h2 className="max-w-[11.25rem] text-h5 font-medium text-dark-500 md:max-w-[18.75rem] md:text-h3">{title}</h2>
        {description && <p className="text-[0.75rem] leading-4 text-dark-400 md:text-body3">{description}</p>}
      </div>

      <div className="relative h-[3.4375rem] w-full overflow-hidden md:h-[5.9375rem] [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <ul className="absolute flex h-full animate-marquee items-center gap-10 will-change-transform md:gap-[5.5rem]">
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
                  style={{ width: `${width / 16}rem`, height: `${LOGO_HEIGHT / 16}rem` }}
                  className="max-md:max-h-[2.375rem] max-md:max-w-[6.6875rem] object-contain"
                />
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
