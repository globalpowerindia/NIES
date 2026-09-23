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
  <section className="my-6 flex flex-col gap-10 rounded-xl bg-light-300 px-5 py-20">
    <SectionHeading eyebrow={eyebrow} title={title} description={description} />

    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <article key={`${category.href}-${index}`} className="flex flex-col gap-3">
          <Link href={category.href} className="relative block aspect-[500/260] w-full overflow-hidden rounded-2xl">
            <Image
              src={category.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
              className="object-cover"
            />
          </Link>
          <div className="flex flex-col items-start gap-3 px-3">
            <p className="text-body1 font-medium text-dark-500">{category.title}</p>
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
