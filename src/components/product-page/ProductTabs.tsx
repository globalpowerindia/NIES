import Link from 'next/link'

import type { SpecRow } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

type Props = {
  attributes: SpecRow[]
  /** Sections further down the page; each tab jumps to its section. */
  sections: { id: string; label: string }[]
}

const AttributeTable = ({ rows }: { rows: SpecRow[] }) => (
  <dl className="flex flex-1 flex-col">
    {rows.map((row, index) => (
      <div key={row.key} className="grid grid-cols-[58%_1fr]">
        <dt
          className={cn(
            'border-[0.5px] border-brand-blue-200 bg-light-400 px-3 py-2 text-[0.625rem] leading-4 text-dark-500 lg:p-5 lg:text-body1',
            index === 0 && 'rounded-tl-sm',
            index === rows.length - 1 && 'rounded-bl-sm',
          )}
        >
          {row.label}
        </dt>
        <dd
          className={cn(
            'border-[0.5px] border-dark-100 px-3 py-2 text-[0.625rem] leading-4 font-medium break-words text-dark-500 lg:p-5 lg:text-body1',
            index === 0 && 'rounded-tr-sm',
            index === rows.length - 1 && 'rounded-br-sm',
          )}
        >
          {row.value}
        </dd>
      </div>
    ))}
  </dl>
)

export const ProductTabs = ({ attributes, sections }: Props) => {
  const half = Math.ceil(attributes.length / 2)
  return (
    <section aria-labelledby="attributes-heading" className="flex flex-col">
      <nav
        aria-label="Product sections"
        className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <span className="rounded-t-xl bg-brand-blue-400 px-6 py-3 text-[0.75rem] leading-5 font-medium whitespace-nowrap text-brand-blue-100 lg:px-8 lg:py-4 lg:text-h6">
          Attributes
        </span>
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`#${section.id}`}
            className="rounded-t-sm px-6 py-3 text-[0.75rem] leading-5 font-medium whitespace-nowrap text-dark-300 transition-colors hover:text-brand-blue-400 lg:px-8 lg:py-4 lg:text-h6"
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 flex flex-col gap-2 rounded-t-xl lg:mt-0 lg:gap-6 lg:rounded-tl-none rounded-b-xl border-[0.5px] border-brand-blue-200 bg-light-100 p-2 lg:p-6">
        <h2 id="attributes-heading" className="text-body3 font-medium text-dark-500 lg:text-h5">
          Key Attributes
        </h2>
        <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
          <AttributeTable rows={attributes.slice(0, half)} />
          {attributes.length > half && <AttributeTable rows={attributes.slice(half)} />}
        </div>
      </div>
    </section>
  )
}
