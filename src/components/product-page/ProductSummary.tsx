import { RichText } from '@payloadcms/richtext-lexical/react'
import { ChevronDown, FileText } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { formatCurrency } from '@/lib/money'
import type { ProductPageData, SpecRow } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

import { BuyRow } from './BuyRow'
import { RatingBadge } from './RatingBadge'

const Divider = () => <hr className="w-full border-t-[0.5px] border-dark-200" />

type RichTextData = Parameters<typeof RichText>[0]['data']

const Accordion = ({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) => (
  <details open={defaultOpen} className="group/acc w-full border-b-[0.5px] border-dark-200 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between pr-6 text-h6 font-medium text-dark-500 [&::-webkit-details-marker]:hidden">
      {title}
      <ChevronDown className="size-6 transition-transform group-open/acc:rotate-180" strokeWidth={1.5} />
    </summary>
    <div className="mt-6">{children}</div>
  </details>
)

const SpecList = ({ rows, className }: { rows: SpecRow[]; className?: string }) => (
  <dl className={cn('grid grid-cols-[auto_auto_1fr] items-start gap-x-5 text-body1', className)}>
    {rows.map((row) => (
      <div key={row.key} className="contents">
        <dt className="text-dark-400">{row.label}</dt>
        <span aria-hidden className="font-medium text-dark-500">
          :
        </span>
        <dd className="font-medium text-dark-500">{row.value}</dd>
      </div>
    ))}
  </dl>
)

const Prose = ({ data }: { data: RichTextData }) => (
  <RichText
    data={data}
    className="flex flex-col gap-3 text-body1 text-dark-400 [&_a]:text-brand-blue-400 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
  />
)

const discountPercent = (price: number, mrp: number) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null)

export const ProductSummary = ({ data, basePath }: { data: ProductPageData; basePath: string }) => {
  const { product, variant, options, rating } = data
  const discount = discountPercent(variant.sellingPricePaise, variant.mrpPaise)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="text-h5 font-medium text-dark-500 sm:text-h3">{product.name}</h1>
            {product.subtitle && <p className="text-body1 font-medium text-dark-300 sm:text-h6">{product.subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {rating.count > 0 && <RatingBadge value={rating.average} />}
            {rating.count > 0 && <span aria-hidden className="h-5 w-px bg-dark-200" />}
            <Link href="#reviews" className="px-1 text-body2 font-medium text-brand-blue-400 hover:underline">
              {rating.count > 0 ? `${rating.count} Review${rating.count === 1 ? '' : 's'}` : 'No reviews yet'}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-h5 font-semibold text-dark-500 sm:text-h3">{formatCurrency(variant.sellingPricePaise)}</p>
          {discount !== null && (
            <>
              <p className="text-h6 font-medium text-dark-300 line-through">
                <span className="sr-only">MRP </span>
                {formatCurrency(variant.mrpPaise)}
              </p>
              <p className="flex h-[22px] items-center gap-1 text-label1 font-medium text-brand-blue-300">
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
            ...(product.modelNumber ? [{ key: 'model', label: 'Model', value: product.modelNumber }] : []),
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
                    !option.inStock && 'opacity-60',
                  )}
                >
                  <span className="font-medium">{option.name}</span>
                  <span>{option.inStock ? formatCurrency(option.pricePaise) : 'Out of stock'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.accessories.length > 0 && (
        <div className="flex flex-col gap-5 rounded-[20px] border-[0.5px] border-brand-blue-200 bg-brand-blue-100 p-5">
          <div className="flex flex-col gap-2">
            <p className="relative h-[30px] w-[169px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/free-ribbon.svg" alt="" width={210.501} height={34.5} className="absolute top-0 left-0 h-[34.5px] w-[210.5px] max-w-none" />
              <span className="absolute top-1 left-[15.83px] bg-linear-to-r from-white to-[#ffea31] bg-clip-text text-h6 font-medium whitespace-nowrap text-transparent">
                Free with purchase
              </span>
            </p>
            <h2 className="text-h5 font-medium text-dark-500">Accessories</h2>
          </div>
          <ul className="flex flex-wrap gap-5">
            {data.accessories.map((item) => (
              <li key={item.name} className="flex items-center gap-4">
                <span className="relative grid h-[86px] w-[109px] shrink-0 place-items-center rounded-xl bg-brand-blue-200 p-5">
                  {item.image && (
                    <Image src={item.image.url} alt="" width={69} height={56} className="h-[56px] w-auto max-w-[69px] object-contain mix-blend-multiply" />
                  )}
                </span>
                <span className="flex flex-col">
                  <span className="text-body1 font-medium text-dark-500">{item.name}</span>
                  {item.quantity && <span className="text-label1 text-dark-400">{item.quantity}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Divider />
      <BuyRow name={product.name} inStock={data.inStock} />
      <Divider />

      <div className="flex flex-col">
        {(product.description || product.shortDesc) && (
          <Accordion title="Description">
            {product.description ? (
              <Prose data={product.description as RichTextData} />
            ) : (
              <p className="text-body1 text-dark-400">{product.shortDesc}</p>
            )}
          </Accordion>
        )}
        {data.summarySpecs.length > 0 && (
          <Accordion title="Technical Specifications" defaultOpen>
            <SpecList rows={data.summarySpecs} className="gap-y-3" />
          </Accordion>
        )}
        {product.keyFeatures && (
          <Accordion title="Key Features">
            <Prose data={product.keyFeatures as RichTextData} />
          </Accordion>
        )}
        {data.userManualUrl && (
          <Accordion title="User Manual">
            <a
              href={data.userManualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-body1 font-medium text-brand-blue-400 hover:underline"
            >
              <FileText className="size-5" />
              Download the user manual (PDF)
            </a>
          </Accordion>
        )}
        {(product.warrantyInfo || product.warrantyMonths) && (
          <Accordion title="Warranty Information">
            {product.warrantyInfo ? (
              <Prose data={product.warrantyInfo as RichTextData} />
            ) : (
              <p className="text-body1 text-dark-400">
                {product.warrantyMonths} months manufacturer warranty against manufacturing defects.
              </p>
            )}
          </Accordion>
        )}
      </div>
    </div>
  )
}
