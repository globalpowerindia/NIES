import { Sparkles } from 'lucide-react'
import Image from 'next/image'

import { SectionHeading } from '@/components/sections/SectionHeading'
import { cn } from '@/lib/utils'

export type ValuePropItem = { iconUrl: string | null; title: string; text?: string }

export type ValuePropsProps = {
  eyebrow?: string
  title?: string
  description?: string
  items: ValuePropItem[]
}

export const ValueProps = ({ eyebrow, title, description, items }: ValuePropsProps) => (
  <section className="flex flex-col gap-4 md:gap-6">
    <SectionHeading eyebrow={eyebrow} title={title} description={description} className="max-md:[&>p]:font-sans max-md:[&>p]:text-[0.75rem] max-md:[&>p]:leading-4" />

    <ul className="-mx-2 -my-3 flex w-[calc(100%+1rem)] snap-x snap-mandatory scroll-px-2 items-start gap-4 overflow-x-auto px-2 py-3 md:mx-0 md:my-0 md:w-full md:px-0 md:py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:items-stretch md:gap-6 lg:grid-cols-6">
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className={cn(
            'card-lift flex w-[calc((100%-1rem)/2.2)] shrink-0 snap-start flex-col items-center gap-2 self-stretch rounded-2xl p-3 text-center md:w-auto md:gap-5 md:rounded-3xl md:p-5',
            index % 2 === 0 ? 'bg-brand-red-200' : 'bg-brand-blue-100',
          )}
        >
          {item.iconUrl ? (
            <Image src={item.iconUrl} alt="" width={52} height={52} className="size-10 object-contain md:size-[3.25rem]" />
          ) : (
            <Sparkles className="size-10 text-brand-blue-500 md:size-[3.25rem]" strokeWidth={1.25} />
          )}
          <h3 className="text-body3 font-semibold text-dark-500 md:text-h6 md:font-semibold md:whitespace-normal">{item.title}</h3>
          {item.text && <p className="text-[0.75rem] leading-4 text-dark-400 md:text-body2 md:leading-6">{item.text}</p>}
        </li>
      ))}
    </ul>
  </section>
)
