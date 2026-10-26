import { RichText } from '@payloadcms/richtext-lexical/react'

import { ProductTabsClient, type TabPanel } from '@/components/product-page/ProductTabsClient'
import type { SpecRow } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'
import type { Product } from '@/payload-types'

type RichTextData = Parameters<typeof RichText>[0]['data']

type Props = {
  attributes: SpecRow[]
  product: Pick<Product, 'description' | 'shortDesc' | 'idealFor' | 'safetyInfo' | 'maintenanceTips'>
}

/** A rich text field with any real text in it; an untouched editor stores an empty paragraph. */
const hasText = (value: unknown): value is RichTextData => {
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false
    const { text, children } = node as { text?: string; children?: unknown[] }
    return Boolean(text?.trim()) || (Array.isArray(children) && children.some(visit))
  }
  return Boolean(value && typeof value === 'object' && visit((value as { root?: unknown }).root))
}

const PanelHeading = ({ children }: { children: string }) => (
  <h2 className="text-body3 font-medium text-dark-500 lg:text-h5">{children}</h2>
)

const Prose = ({ data }: { data: RichTextData }) => (
  <RichText
    data={data}
    className="flex max-w-[60rem] flex-col gap-3 text-[0.75rem] leading-5 text-dark-400 lg:text-body1 [&_a]:text-brand-blue-400 [&_a]:underline [&_h3]:font-semibold [&_h3]:text-dark-500 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:text-dark-500 [&_ul]:list-disc [&_ul]:pl-6"
  />
)

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

/**
 * Attributes, Description, Ideal For, Safety Information and Maintenance Tips
 * (Figma 885:46492). Attributes always shows; the others only when staff have
 * written them (Products → Content).
 */
export const ProductTabs = ({ attributes, product }: Props) => {
  const half = Math.ceil(attributes.length / 2)
  const texts: { id: string; label: string; value: unknown }[] = [
    { id: 'description', label: 'Description', value: product.description },
    { id: 'ideal-for', label: 'Ideal For', value: product.idealFor },
    { id: 'safety', label: 'Safety Information', value: product.safetyInfo },
    { id: 'maintenance', label: 'Maintenance Tips', value: product.maintenanceTips },
  ]
  const panels: TabPanel[] = [
    {
      id: 'attributes',
      label: 'Attributes',
      content: (
        <>
          <PanelHeading>Key Attributes</PanelHeading>
          <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
            <AttributeTable rows={attributes.slice(0, half)} />
            {attributes.length > half && <AttributeTable rows={attributes.slice(half)} />}
          </div>
        </>
      ),
    },
    ...texts.flatMap(({ id, label, value }) =>
      hasText(value)
        ? [{ id, label, content: <><PanelHeading>{label}</PanelHeading><Prose data={value} /></> }]
        : // Like the summary above, a product with only a short description shows that.
          id === 'description' && product.shortDesc?.trim()
          ? [{ id, label, content: <><PanelHeading>{label}</PanelHeading><p className="max-w-[60rem] text-[0.75rem] leading-5 text-dark-400 lg:text-body1">{product.shortDesc}</p></> }]
          : [],
    ),
  ]
  return <ProductTabsClient panels={panels} />
}
