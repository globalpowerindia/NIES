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
            'border-[0.5px] border-brand-blue-200 bg-light-400 p-4 text-body2 text-dark-500 sm:p-5 sm:text-body1',
            index === 0 && 'rounded-tl-sm',
            index === rows.length - 1 && 'rounded-bl-sm',
          )}
        >
          {row.label}
        </dt>
        <dd
          className={cn(
            'border-[0.5px] border-dark-100 p-4 text-body2 font-medium text-dark-500 sm:p-5 sm:text-body1',
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
      <nav aria-label="Product sections" className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="rounded-t-xl bg-brand-blue-400 px-6 py-3 text-body1 font-medium whitespace-nowrap text-brand-blue-100 sm:px-8 sm:py-4 sm:text-h6">
          Attributes
        </span>
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`#${section.id}`}
            className="rounded-t-sm px-6 py-3 text-body1 font-medium whitespace-nowrap text-dark-300 transition-colors hover:text-brand-blue-400 sm:px-8 sm:py-4 sm:text-h6"
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-6 rounded-tr-xl rounded-b-xl border-[0.5px] border-brand-blue-200 bg-light-100 p-4 sm:p-6">
        <h2 id="attributes-heading" className="text-h5 font-medium text-dark-500">
          Key Attributes
        </h2>
        <div className="flex flex-col gap-6 xl:flex-row">
          <AttributeTable rows={attributes.slice(0, half)} />
          {attributes.length > half && <AttributeTable rows={attributes.slice(half)} />}
        </div>
      </div>
    </section>
  )
}
