import Image from 'next/image'

import { NewsletterForm } from '@/components/sections/NewsletterForm'

export const Newsletter = ({ title, description }: { title?: string; description?: string }) => (
  <section className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand-red-500 px-4 py-10 md:items-center md:gap-10 md:px-8 md:py-20 min-[1652px]:flex-row min-[1652px]:gap-0 min-[1652px]:px-[250px]">
    <div className="flex max-w-[587px] flex-col items-start gap-3 md:flex-row md:items-center md:gap-10">
      <Image
        src="/icons/newsletter.svg"
        alt=""
        width={100}
        height={100}
        className="size-[58px] shrink-0 md:size-[100px]"
      />
      <div className="flex flex-col gap-6">
        {title && <h2 className="text-h5 font-semibold text-light-100 md:text-h3 md:font-medium">{title}</h2>}
        {description && <p className="text-[12px] leading-4 text-brand-red-200 md:text-body2">{description}</p>}
      </div>
    </div>

    <NewsletterForm />
  </section>
)
