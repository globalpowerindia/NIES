import { BookOpen } from 'lucide-react'
import Image from 'next/image'

import { ButtonLink } from '@/components/ui/Button'
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
  <section className="my-10 flex flex-col overflow-hidden rounded-2xl lg:flex-row">
    <div className="flex flex-1 items-center bg-brand-blue-100 px-8 py-20 lg:px-[150px]">
      <div className="flex w-full max-w-[450px] flex-col gap-6">
        <h2 className="text-h3 font-medium text-balance text-dark-500">{title}</h2>
        {description && <p className="text-body3 text-dark-400">{description}</p>}
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
