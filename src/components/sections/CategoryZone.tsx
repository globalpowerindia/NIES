import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { SectionHeading } from '@/components/sections/SectionHeading'

export type CategoryTile = {
  title: string
  linkLabel: string
  href: string
  image: string
}

export type CategoryZoneProps = {
  eyebrow?: string
  title?: string
  description?: string
  categories: CategoryTile[]
}

export const CategoryZone = ({ eyebrow, title, description, categories }: CategoryZoneProps) => (
  <section className="flex flex-col gap-4 md:gap-6 md:rounded-xl md:bg-light-300 md:p-8">
    <SectionHeading eyebrow={eyebrow} title={title} description={description} />

    <div className="-mx-2 -my-3 flex snap-x snap-mandatory scroll-px-2 gap-4 overflow-x-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {categories.map((category, index) => (
        <article key={`${category.href}-${index}`} className="flex w-[17.125rem] shrink-0 snap-start flex-col gap-3 md:w-auto">
          <Link href={category.href} className="card-lift relative block aspect-[500/260] w-full overflow-hidden rounded-2xl">
            <Image
              src={category.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
              className="object-cover"
            />
          </Link>
          <div className="flex flex-col items-start gap-3 px-3">
            <p className="text-body2 font-medium text-dark-500 md:text-body1">{category.title}</p>
            <Link
              href={category.href}
              className="flex items-center gap-1 py-1 text-body2 text-brand-blue-300 hover:underline"
            >
              {category.linkLabel}
              <ArrowRight className="size-6" strokeWidth={1.5} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  </section>
)
