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
  <section className="flex flex-col gap-6 py-10 md:gap-12">
    <SectionHeading eyebrow={eyebrow} title={title} description={description} className="gap-6 max-md:[&>p]:font-sans max-md:[&>p]:text-[12px] max-md:[&>p]:leading-4" />

    <ul className="flex w-full snap-x snap-mandatory items-start gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:items-stretch md:gap-6 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className={cn(
            'flex min-h-[220px] w-[219px] shrink-0 snap-start flex-col items-center gap-5 rounded-3xl p-5 text-center md:min-h-0 md:w-auto',
            index % 2 === 0 ? 'bg-brand-red-200' : 'bg-brand-blue-100',
          )}
        >
          {item.iconUrl ? (
            <Image src={item.iconUrl} alt="" width={52} height={52} className="size-[52px] object-contain" />
          ) : (
            <Sparkles className="size-[52px] text-brand-blue-500" strokeWidth={1.25} />
          )}
          <h3 className="text-body1 font-medium whitespace-nowrap text-dark-500 md:text-h6 md:font-semibold md:whitespace-normal">{item.title}</h3>
          {item.text && <p className="text-body3 text-dark-400 md:text-body2">{item.text}</p>}
        </li>
      ))}
    </ul>
  </section>
)
