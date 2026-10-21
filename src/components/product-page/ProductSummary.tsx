import { RichText } from '@payloadcms/richtext-lexical/react'
import { FileText } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cardPrice } from '@/components/product/ProductCard'
import { formatCurrency } from '@/lib/money'
import type { ProductPageData, SpecRow } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

import { BuyRow } from './BuyRow'
import { RatingBadge } from './RatingBadge'

const Divider = () => <hr className="w-full border-t-[0.5px] border-dark-200" />

type RichTextData = Parameters<typeof RichText>[0]['data']

/** One product detail section, on shadcn's Accordion with the Figma heading and divider. */
const Section = ({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) => (
  <Accordion type="single" collapsible defaultValue={defaultOpen ? 'open' : undefined}>
    <AccordionItem value="open" className="w-full border-b-[0.5px] border-dark-200 py-3 lg:py-4">
      <AccordionTrigger className="pr-2 text-body3 font-medium lg:pr-6 lg:text-h6 text-dark-500">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pt-3 lg:pt-6">{children}</AccordionContent>
    </AccordionItem>
  </Accordion>
)

const SpecList = ({ rows, className }: { rows: SpecRow[]; className?: string }) => (
  <dl
    className={cn(
      'grid grid-cols-[auto_auto_1fr] items-start gap-x-2 text-[0.75rem] leading-5 lg:gap-x-5 lg:text-body1',
      className,
    )}
  >
    {rows.map((row) => (
      <div key={row.key} className="contents">
        <dt className="text-dark-400">{row.label}</dt>
        <span aria-hidden className="font-medium text-dark-500">
          :
        </span>
        <dd className="min-w-0 font-medium break-words text-dark-500">{row.value}</dd>
      </div>
    ))}
  </dl>
)

const Prose = ({ data }: { data: RichTextData }) => (
  <RichText
    data={data}
    className="flex flex-col gap-3 text-[0.75rem] leading-5 text-dark-400 lg:text-body1 [&_a]:text-brand-blue-400 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
  />
)

const discountPercent = (price: number, mrp: number) =>
  mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null

export const ProductSummary = ({ data, basePath }: { data: ProductPageData; basePath: string }) => {
  const { product, variant, options, rating } = data
  const discount = variant.sellingPricePaise > 0 ? discountPercent(variant.sellingPricePaise, variant.mrpPaise) : null
  const sellOnline = product.sellOnline === true

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="text-h5 font-medium text-dark-500 lg:text-h3">{product.name}</h1>
            {product.subtitle && (
              <p className="text-body3 font-medium text-dark-300 lg:text-h6">{product.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {rating.count > 0 && <RatingBadge value={rating.average} />}
            {rating.count > 0 && <span aria-hidden className="h-5 w-px bg-dark-200" />}
            <Link
              href="#reviews"
              className="px-1 text-body2 font-medium text-brand-blue-400 hover:underline"
            >
              {rating.count > 0
                ? `${rating.count} Review${rating.count === 1 ? '' : 's'}`
                : 'No reviews yet'}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-h5 font-semibold text-dark-500 lg:text-h3">{cardPrice(variant.sellingPricePaise)}</p>
          {discount !== null && (
            <>
              <p className="text-body3 font-medium text-dark-300 line-through lg:text-h6">
                <span className="sr-only">MRP </span>
                {formatCurrency(variant.mrpPaise)}
              </p>
              <p className="flex h-[1.375rem] items-center gap-1 text-[0.75rem] font-medium lg:text-label1 text-brand-blue-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/offer.svg" alt="" width={20} height={20} className="size-5" />
                {discount}% off
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Divider />
        <SpecList
          className="gap-y-1"
          rows={[
            ...(data.brandName ? [{ key: 'brand', label: 'Brand', value: data.brandName }] : []),
            ...(product.modelNumber
              ? [{ key: 'model', label: 'Model', value: product.modelNumber }]
              : []),
            ...(options.length > 1 ? [{ key: 'sku', label: 'SKU', value: variant.sku }] : []),
          ]}
        />
        <Divider />
      </div>

      {options.length > 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-body1 font-medium text-dark-500">Choose an option</p>
          <ul className="flex flex-wrap gap-2">
            {options.map((option) => (
              <li key={option.sku}>
                <Link
                  href={`${basePath}?variant=${encodeURIComponent(option.sku)}`}
                  scroll={false}
                  replace
                  aria-current={option.sku === variant.sku ? 'true' : undefined}
                  className={cn(
                    'flex flex-col rounded-xl border px-4 py-2 text-body3 transition-colors',
                    option.sku === variant.sku
                      ? 'border-brand-blue-500 bg-brand-blue-100 text-dark-500'
                      : 'border-brand-blue-200 bg-light-100 text-dark-400 hover:border-brand-blue-400',
                    sellOnline && !option.inStock && 'opacity-60',
                  )}
                >
                  <span className="font-medium">{option.name}</span>
                  <span>{option.inStock || !sellOnline ? cardPrice(option.pricePaise) : 'Out of stock'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.accessories.length > 0 && (
        <div className="flex flex-col gap-5 rounded-[1.25rem] border-[0.5px] border-brand-blue-200 bg-brand-blue-100 p-5">
          <div className="flex flex-col gap-2">
            <p className="relative h-[1.875rem] w-[10.5625rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/free-ribbon.svg"
                alt=""
                width={210.501}
                height={34.5}
                className="absolute top-0 left-0 h-[2.15625rem] w-[13.15625rem] max-w-none"
              />
              <span className="absolute top-1 left-[0.989375rem] bg-linear-to-r from-white to-[#ffea31] bg-clip-text text-h6 font-medium whitespace-nowrap text-transparent">
                Free with purchase
              </span>
            </p>
            <h2 className="text-h5 font-medium text-dark-500">Accessories</h2>
          </div>
          <ul className="flex flex-wrap gap-3 lg:gap-5">
            {data.accessories.map((item) => (
              <li key={item.name} className="flex items-center gap-2 lg:gap-4">
                <span className="relative grid h-14 w-16 lg:h-[5.375rem] lg:w-[6.8125rem] shrink-0 place-items-center rounded-xl bg-brand-blue-200 p-2 lg:p-5">
                  {item.image && (
                    <Image
                      src={item.image.url}
                      alt=""
                      width={69}
                      height={56}
                      className="h-10 w-auto max-w-12 lg:h-[3.5rem] lg:max-w-[4.3125rem] object-contain mix-blend-multiply"
                    />
                  )}
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.75rem] font-medium text-dark-500 lg:text-body1">
                    {item.name}
                  </span>
                  {item.quantity && (
                    <span className="text-[0.75rem] text-dark-400 lg:text-label1">
                      {item.quantity}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Divider />
      <BuyRow name={product.name} variantId={variant.id} inStock={data.inStock} sellOnline={sellOnline} href={basePath} />
      <Divider />

      <div className="flex flex-col">
        {(product.description || product.shortDesc) && (
          <Section title="Description">
            {product.description ? (
              <Prose data={product.description as RichTextData} />
            ) : (
              <p className="text-[0.75rem] leading-5 text-dark-400 lg:text-body1">
                {product.shortDesc}
              </p>
            )}
          </Section>
        )}
        {data.summarySpecs.length > 0 && (
          <Section title="Technical Specifications" defaultOpen>
            <SpecList rows={data.summarySpecs} className="gap-y-3" />
          </Section>
        )}
        {product.keyFeatures && (
          <Section title="Key Features">
            <Prose data={product.keyFeatures as RichTextData} />
          </Section>
        )}
        {data.userManualUrl && (
          <Section title="User Manual">
            <a
              href={data.userManualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-body1 font-medium text-brand-blue-400 hover:underline"
            >
              <FileText className="size-5" />
              Download the user manual (PDF)
            </a>
          </Section>
        )}
        {(product.warrantyInfo || product.warrantyMonths) && (
          <Section title="Warranty Information">
            {product.warrantyInfo ? (
              <Prose data={product.warrantyInfo as RichTextData} />
            ) : (
              <p className="text-[0.75rem] leading-5 text-dark-400 lg:text-body1">
                {product.warrantyMonths} months manufacturer warranty against manufacturing defects.
              </p>
            )}
          </Section>
        )}
      </div>
    </div>
  )
}
