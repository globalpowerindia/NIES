import Image from 'next/image'

import { NewsletterForm } from '@/components/sections/NewsletterForm'

export const Newsletter = ({ title, description }: { title?: string; description?: string }) => (
  <section className="my-20 flex flex-col items-center justify-between gap-10 rounded-2xl bg-brand-red-500 px-8 py-20 lg:flex-row lg:px-[150px] xl:px-[250px]">
    <div className="flex max-w-[587px] items-center gap-10">
      <Image
        src="/icons/newsletter.svg"
        alt=""
        width={100}
        height={100}
        className="hidden size-[100px] shrink-0 sm:block"
      />
      <div className="flex flex-col gap-6">
        {title && <h2 className="text-h3 font-medium text-light-100">{title}</h2>}
        {description && <p className="text-body2 text-brand-red-200">{description}</p>}
      </div>
    </div>

    <NewsletterForm />
  </section>
)
