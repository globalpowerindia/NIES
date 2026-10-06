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
  <section className="-mx-4 flex flex-col-reverse overflow-hidden md:mx-0 md:rounded-2xl lg:flex-row">
    <div className="flex flex-1 items-center bg-brand-blue-100 px-4 py-10 md:px-8 md:py-20 lg:px-[150px]">
      <div className="flex w-full max-w-[450px] flex-col gap-6">
        <h2 className="max-w-[260px] text-h5 font-semibold text-balance text-dark-500 md:max-w-none md:text-h3 md:font-medium">{title}</h2>
        {description && <p className="text-[12px] leading-4 text-dark-400 md:text-body3">{description}</p>}
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
    <div className="relative min-h-[260px] flex-1 lg:min-h-[404px]">
      <Image src={image.url} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
    </div>
  </section>
)
