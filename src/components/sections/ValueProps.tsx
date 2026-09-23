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
  <section className="flex flex-col gap-12 py-10">
    <SectionHeading eyebrow={eyebrow} title={title} description={description} />

    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className={cn(
            'flex flex-col items-center gap-5 rounded-3xl p-5 text-center',
            index % 2 === 0 ? 'bg-brand-red-200' : 'bg-brand-blue-100',
          )}
        >
          {item.iconUrl ? (
            <Image src={item.iconUrl} alt="" width={52} height={52} className="size-[52px] object-contain" />
          ) : (
            <Sparkles className="size-[52px] text-brand-blue-500" strokeWidth={1.25} />
          )}
          <h3 className="text-h6 font-semibold text-dark-500">{item.title}</h3>
          {item.text && <p className="text-body2 text-dark-400">{item.text}</p>}
        </li>
      ))}
    </ul>
  </section>
)
