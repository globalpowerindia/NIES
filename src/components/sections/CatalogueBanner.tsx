import { BookOpen } from 'lucide-react'
import Image from 'next/image'

import { ButtonLink } from '@/components/ui/button'
import type { MediaInfo } from '@/lib/storefront/content'

export type CatalogueBannerProps = {
  title: string
  description?: string
  buttonLabel?: string
  href: string | null
  isDownload: boolean
  image: MediaInfo
}

export const CatalogueBanner = ({ title, description, buttonLabel, href, isDownload, image }: CatalogueBannerProps) => (
  <section className="-mx-4 flex flex-col-reverse overflow-hidden md:mx-0 md:rounded-2xl lg:grid lg:grid-cols-2">
    <div className="flex min-w-0 flex-1 items-center bg-brand-blue-100 px-4 py-10 md:px-8 md:py-20 lg:px-[18.5185%]">
      <div className="flex w-full max-w-[28.125rem] flex-col gap-6">
        <h2 className="max-w-[16.25rem] text-h5 font-semibold text-balance text-dark-500 md:max-w-none md:text-h3 md:font-medium">{title}</h2>
        {description && <p className="text-[0.75rem] leading-4 text-dark-400 md:text-body3">{description}</p>}
        {href && (
          <ButtonLink
            href={href}
            variant="blue"
            className="self-start"
            target={isDownload ? '_blank' : undefined}
            rel={isDownload ? 'noopener' : undefined}
          >
            <BookOpen className="size-5" strokeWidth={1.5} />
            {buttonLabel || 'Download Catalogue'}
          </ButtonLink>
        )}
      </div>
    </div>
    <div className="relative min-h-[16.25rem] flex-1 lg:min-h-[25.25rem]">
      <Image src={image.url} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
    </div>
  </section>
)
