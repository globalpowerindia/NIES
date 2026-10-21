import Image from 'next/image'

import type { MediaInfo } from '@/lib/storefront/content'
import type { ProductPageData } from '@/lib/storefront/product-page'

/** Supplier artwork with its lettering baked in. With a PDF attached, the whole banner downloads it. */
export const SupplierBrochure = ({
  brochure,
}: {
  brochure: NonNullable<ProductPageData['brochure']>
}) => {
  const art = (
    <Image
      src={brochure.image.url}
      alt={brochure.image.alt || 'Product brochure'}
      width={brochure.image.width ?? 1620}
      height={brochure.image.height ?? 601}
      sizes="(max-width: 1652px) 100vw, 1620px"
      className="h-auto w-full rounded-xl max-lg:aspect-[358/177] max-lg:object-cover lg:rounded-3xl"
    />
  )
  return (
    <section
      id="supplier-description"
      aria-labelledby="supplier-heading"
      className="flex scroll-mt-6 flex-col gap-6"
    >
      <h2 id="supplier-heading" className="text-body2 font-medium text-dark-500 lg:text-h5">
        Product Description From the Supplier
      </h2>
      {brochure.fileUrl ? (
        <a
          href={brochure.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download the product brochure (PDF)"
          className="block rounded-xl lg:rounded-3xl transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue-500"
        >
          {art}
        </a>
      ) : (
        art
      )}
    </section>
  )
}

export const Applications = ({ title, items }: ProductPageData['applications']) => (
  <section
    id="applications"
    aria-labelledby="applications-heading"
    className="flex scroll-mt-6 flex-col gap-2 lg:gap-6"
  >
    <h2 id="applications-heading" className="text-label1 font-medium text-dark-500 lg:text-h5">
      {title}
    </h2>
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-5 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col">
          <div className="relative aspect-[2000/1333] w-full overflow-hidden rounded-t-xl">
            <Image
              src={item.image.url}
              alt=""
              fill
              sizes="(max-width: 1024px) 50vw, 390px"
              className="object-cover"
            />
          </div>
          <p className="flex h-[2.375rem] items-center justify-center rounded-b-xl bg-brand-blue-400 text-center text-label2 font-medium text-light-100 lg:h-auto lg:py-4 lg:text-h5">
            {item.label}
          </p>
        </li>
      ))}
    </ul>
  </section>
)

export const FeatureBanners = ({ images }: { images: MediaInfo[] }) => (
  // 16px under the applications on phones (Figma mobile), 24px elsewhere.
  <div className="flex flex-col gap-4 max-lg:-mt-2 lg:gap-6">
    {images.map((image) => (
      <Image
        key={image.url}
        src={image.url}
        alt={image.alt}
        width={image.width ?? 1620}
        height={image.height ?? 1060}
        sizes="(max-width: 1652px) 100vw, 1620px"
        className="h-auto w-full rounded-xl lg:rounded-2xl"
      />
    ))}
  </div>
)
