import { RichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Breadcrumbs, type Crumb } from '@/components/catalog/Breadcrumbs'
import { EnquireButton } from '@/components/enquiry/EnquireButton'
import { cardPrice } from '@/components/product/ProductCard'
import { CompareTable } from '@/components/product-page/CompareTable'
import {
  Applications,
  FeatureBanners,
  SupplierBrochure,
} from '@/components/product-page/ProductExtras'
import { ProductGallery } from '@/components/product-page/ProductGallery'
import { ProductMobileBack } from '@/components/product-page/ProductMobileBack'
import { ProductViewers } from '@/components/product-page/ProductViewers'
import { RatingBadge } from '@/components/product-page/RatingBadge'
import { ReviewsSection } from '@/components/product-page/ReviewsSection'
import styles from '@/components/product-page/product-mobile.module.css'
import { RecentlyViewed } from '@/components/sections/RecentlyViewed'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { formatCurrency, SELLER_STATE_CODE, splitInclusive } from '@/lib/money'
import { shippingFeePaise, parcelWeightGrams, type ShippingRates } from '@/lib/shipping'
import type { ProductPageData, SpecRow } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'
import type { SiteSetting } from '@/payload-types'

import { BuyBox } from './BuyBox'
import { ContentSections, contentSectionId } from './ContentSections'
import { Panel } from './Panel'
import { Reveal } from './Reveal'
import { SectionNav, type NavSection } from './SectionNav'
import { StoreTrust, type StoreStats } from './StoreTrust'
import { SupplierImages } from './SupplierImages'

type RichTextData = Parameters<typeof RichText>[0]['data']

type Props = {
  data: ProductPageData
  /** E.g. "12 sold in the last 24 hours"; null until the product has enough to show. */
  demand: string | null
  rates: ShippingRates
  /** Whether the tax invoice details are filled in, so customers can really download one. */
  hasInvoice: boolean
  tollFreeNumber?: string | null
  /** One or two lines about the product, for the gallery's video and 3D views. */
  galleryDescription: string
  siteName: string
  logoUrl: string | null
  stats: StoreStats
  pageSettings?: SiteSetting['productPage']
}

/** Specs that say who made it or how it's covered, rather than what it can do. */
const NOT_A_FIGURE = new Set(['name', 'model', 'brand', 'type', 'origin', 'weight', 'warranty'])

/** A rich text field with any real text in it; an untouched editor stores an empty paragraph. */
const hasText = (value: unknown): value is RichTextData => {
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false
    const { text, children } = node as { text?: string; children?: unknown[] }
    return Boolean(text?.trim()) || (Array.isArray(children) && children.some(visit))
  }
  return Boolean(value && typeof value === 'object' && visit((value as { root?: unknown }).root))
}

const Prose = ({ data }: { data: RichTextData }) => (
  <RichText
    data={data}
    className="flex flex-col gap-3 text-body3 text-dark-400 lg:text-h6 lg:leading-relaxed [&_a]:text-brand-blue-400 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-dark-500 [&_ul]:list-disc [&_ul]:pl-5"
  />
)

const PriceBlock = ({ data }: { data: ProductPageData }) => {
  const { variant, product } = data
  const price = variant.sellingPricePaise
  if (price <= 0) return <p className="text-h5 font-semibold text-dark-500">{cardPrice(price)}</p>

  const off =
    variant.mrpPaise > price
      ? Math.round(((variant.mrpPaise - price) / variant.mrpPaise) * 100)
      : null
  const gstRate = product.gstRateBps ?? 0
  const { taxablePaise, taxPaise } = splitInclusive(price, gstRate)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-h4 font-bold text-dark-500 lg:text-h3">{formatCurrency(price)}</p>
        <p className="text-body3 text-dark-400 lg:text-body1">incl. of all taxes</p>
      </div>
      <p className="text-body3 text-dark-400 lg:text-body1">
        {formatCurrency(taxablePaise)} + {formatCurrency(taxPaise)} GST ({gstRate / 100}%)
      </p>
      {off !== null && (
        <p className="flex flex-wrap items-center gap-2 text-body3 lg:text-body1">
          <span className="text-dark-400">
            MRP <span className="line-through">{formatCurrency(variant.mrpPaise)}</span>
          </span>
          <span className="rounded-md bg-green-100 px-1.5 py-0.5 font-semibold text-green-400">
            {off}% off
          </span>
          <span className="font-medium text-dark-400">
            You save {formatCurrency(variant.mrpPaise - price)}
          </span>
        </p>
      )}
    </div>
  )
}

/** Answers built from this product's own fields and the shop's real checkout rules. */
const faqsOf = (data: ProductPageData, rates: ShippingRates, hasInvoice: boolean) => {
  const { product, variant, attributes, accessories } = data
  const spec = (pattern: RegExp) =>
    attributes.find((row: SpecRow) => pattern.test(row.label))?.value
  const capacity = spec(/dia|capacity/i)
  const supply = spec(/volt/i)
  const weight = parcelWeightGrams(
    [{ weightGrams: variant.weightGrams, quantity: 1 }],
    rates.defaultWeightGrams,
  )
  // Every state outside Kerala pays the same rate.
  const other = '29'

  const faqs: (false | null | undefined | 0 | '' | { q: string; a: ReactNode })[] = [
    capacity && {
      q: `What can the ${product.modelNumber || product.name} drill?`,
      a: `Its drilling capacity is ${capacity}.`,
    },
    supply && { q: 'What power supply does it need?', a: `It runs on ${supply}.` },
    product.warrantyMonths && {
      q: 'Does it come with a warranty?',
      a: `Yes, ${product.warrantyMonths} months manufacturer warranty against manufacturing defects.`,
    },
    accessories.length > 0 && {
      q: 'What comes free with it?',
      a: accessories
        .map((item) => [item.name, item.quantity].filter(Boolean).join(', '))
        .join(' and '),
    },
    product.sellOnline === true && {
      q: 'How much is delivery?',
      a: `${formatCurrency(shippingFeePaise(rates, weight, SELLER_STATE_CODE))} within Kerala and ${formatCurrency(shippingFeePaise(rates, weight, other))} to other states for this item alone. Delivery is charged by weight, and checkout shows the exact charge before you pay.`,
    },
    product.sellOnline === true && {
      q: 'How can I pay? Is cash on delivery available?',
      a: 'Orders are paid online at checkout through Razorpay. Cash on delivery is not available.',
    },
    hasInvoice && {
      q: 'Will I get a GST invoice?',
      a: 'Yes. You can download it from your order in My Account.',
    },
    {
      q: 'Can I return it?',
      a: (
        <>
          See our{' '}
          <Link href="/returns" className="text-brand-blue-400 underline">
            Return &amp; Refund Policy
          </Link>{' '}
          for when returns and refunds apply.
        </>
      ),
    },
  ]
  const own = data.faqs.map((faq) => ({ q: faq.question, a: faq.answer }))
  return [...own, ...faqs.filter((faq): faq is { q: string; a: ReactNode } => Boolean(faq))]
}

export const ProductDetail = ({
  data,
  demand,
  rates,
  hasInvoice,
  tollFreeNumber,
  galleryDescription,
  siteName,
  logoUrl,
  stats,
  pageSettings,
}: Props) => {
  const { product, variant, options, rating, category, parentCategory, accessories, attributes } =
    data
  const canonical = `/products/${product.slug}`
  const sellOnline = product.sellOnline === true

  const crumbs: Crumb[] = [
    ...(parentCategory
      ? [{ label: parentCategory.name, href: `/category/${parentCategory.slug}` }]
      : []),
    ...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []),
    { label: product.name },
  ]

  const figures = (
    data.summarySpecs.length > 0
      ? data.summarySpecs
      : attributes.filter((row) => !NOT_A_FIGURE.has(row.key))
  ).slice(0, 4)

  const hasFeatures = hasText(product.keyFeatures)
  const hasDescription = hasText(product.description)
  const descriptionText = product.shortDesc?.trim()
  const about = hasDescription ? (
    <Prose data={product.description as RichTextData} />
  ) : descriptionText ? (
    <p className="text-body3 text-dark-400 lg:text-h6 lg:leading-relaxed">{descriptionText}</p>
  ) : null
  const hasOverview = hasFeatures || Boolean(about)
  const care = [
    {
      key: 'ideal',
      title: 'Ideal for',
      field: product.idealFor,
    },
    {
      key: 'safety',
      title: 'Safety',
      field: product.safetyInfo,
    },
    {
      key: 'care',
      title: 'Maintenance',
      field: product.maintenanceTips,
    },
  ].filter((card) => hasText(card.field))

  const faqs = faqsOf(data, rates, hasInvoice)
  const { contentSections } = data

  const sections: NavSection[] = [
    ...(hasOverview ? [{ id: 'overview', label: 'Overview' }] : []),
    { id: 'specifications', label: 'Specifications' },
    ...(contentSections.length > 0
      ? [
          {
            id: contentSectionId(0),
            label: 'Details',
            alsoIds: contentSections.slice(1).map((_, index) => contentSectionId(index + 1)),
          },
        ]
      : []),
    ...(care.length > 0 ? [{ id: 'using', label: 'Using it' }] : []),
    { id: 'customer-reviews', label: 'Reviews' },
    { id: 'faqs', label: 'FAQs' },
  ]

  // With no accessories the facts column is shorter than the gallery, so the specs run below both.
  const wideGlance = accessories.length === 0
  const glance = figures.length > 0 && (
    <section
      aria-label="At a glance"
      className="overflow-hidden rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100"
    >
      <dl
        className={cn(
          'grid grid-cols-2',
          wideGlance && 'lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none',
        )}
      >
        {figures.map((row) => (
          <div
            key={row.key}
            className={cn(
              'flex min-w-0 flex-col gap-0.5 border-dark-100 p-3 odd:border-r-[0.5px] lg:p-4 [&:nth-child(-n+2)]:border-b-[0.5px]',
              wideGlance &&
                'lg:border-r-[0.5px] lg:last:border-r-0 lg:[&:nth-child(-n+2)]:border-b-0',
            )}
          >
            <dd className="order-2 text-body2 font-semibold break-words text-dark-500 lg:text-h5">
              {row.value}
            </dd>
            <dt className="order-1 text-label3 text-dark-400 lg:text-body1">{row.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )

  return (
    <main className={`${styles.page} bg-light-400 pb-8 lg:[&_section>h2]:text-h4`}>
      <div className="container-page">
        <ProductMobileBack fallback={category ? `/category/${category.slug}` : '/products'} />
      </div>

      <div className="container-page flex flex-col gap-5 lg:pt-5">
        <div className="hidden lg:block">
          <Breadcrumbs items={crumbs} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-6">
          {/* Gallery and the facts a shopper reads first */}
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="min-w-0 lg:sticky lg:top-16">
              <ProductGallery
                key={variant.id}
                productId={product.id}
                images={data.images}
                videos={data.videos}
                spin={data.spin}
                modelUrl={data.modelUrl}
                name={product.name}
                description={galleryDescription}
              />
              {glance && !wideGlance && <div className="mt-5 hidden lg:block">{glance}</div>}
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-label3 font-semibold lg:text-body1">
                {data.brandName && (
                  <span className="rounded-full bg-brand-blue-500 px-2.5 py-1 text-light-100">
                    {data.brandName}
                  </span>
                )}
                {product.modelNumber && (
                  <span className="rounded-full bg-light-500 px-2.5 py-1 text-dark-400">
                    Model {product.modelNumber}
                  </span>
                )}
                {options.length > 1 && (
                  <span className="rounded-full bg-light-500 px-2.5 py-1 text-dark-400">
                    SKU {variant.sku}
                  </span>
                )}
                {sellOnline && data.inStock && (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-400">
                    In stock
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <h1 className="text-h5 font-medium text-dark-500 lg:text-h3">{product.name}</h1>
                {product.subtitle && (
                  <p className="text-body2 text-dark-400 lg:text-h6">{product.subtitle}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {rating.count > 0 && <RatingBadge value={rating.average} />}
                <a
                  href="#customer-reviews"
                  className="flex items-center gap-1 text-body3 font-medium text-brand-blue-400 hover:underline lg:text-body1"
                >
                  {rating.count > 0
                    ? `${rating.count} Review${rating.count === 1 ? '' : 's'}`
                    : 'Be the first to review'}
                </a>
                {demand && (
                  <p className="flex items-center gap-1 text-body3 font-medium text-dark-400 lg:text-body1">
                    {demand}
                  </p>
                )}
              </div>
              <ProductViewers productId={product.id} />

              {/* From xl the price moves into the rail beside the page. */}
              <div className="xl:hidden">
                <PriceBlock data={data} />
              </div>

              {options.length > 1 && (
                <div className="flex flex-col gap-2">
                  <p className="text-body3 font-medium text-dark-500 lg:text-h6">
                    Choose an option
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {options.map((option) => (
                      <li key={option.sku}>
                        <Link
                          href={`${canonical}?variant=${encodeURIComponent(option.sku)}`}
                          scroll={false}
                          replace
                          aria-current={option.sku === variant.sku ? 'true' : undefined}
                          className={cn(
                            'flex flex-col rounded-xl border px-3 py-2 text-body3 transition-colors lg:text-body1',
                            option.sku === variant.sku
                              ? 'border-brand-red-500 bg-brand-red-100 text-dark-500'
                              : 'border-dark-100 bg-light-100 text-dark-400 hover:border-dark-300',
                            sellOnline && !option.inStock && 'opacity-60',
                          )}
                        >
                          <span className="font-medium">{option.name}</span>
                          <span>
                            {option.inStock || !sellOnline
                              ? cardPrice(option.pricePaise)
                              : 'Out of stock'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {accessories.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100 p-4">
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
                  <ul className="flex flex-wrap gap-3">
                    {accessories.map((item) => (
                      <li key={item.name} className="flex items-center gap-2">
                        <span className="relative grid size-12 shrink-0 place-items-center rounded-lg bg-light-300 p-1 lg:size-16">
                          {item.image && (
                            <Image
                              src={item.image.url}
                              alt=""
                              width={40}
                              height={40}
                              className="size-10 object-contain lg:size-14"
                            />
                          )}
                        </span>
                        <span className="flex flex-col text-body3 lg:text-body1">
                          <span className="font-medium text-dark-500">{item.name}</span>
                          {item.quantity && <span className="text-dark-400">{item.quantity}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <StoreTrust
                siteName={siteName}
                logoUrl={logoUrl}
                stats={stats}
                warrantyMonths={product.warrantyMonths}
                sellOnline={sellOnline}
                hasInvoice={hasInvoice}
                tollFreeNumber={tollFreeNumber}
                settings={pageSettings}
              />
            </div>
          </div>

          {/* The rail: stays in view beside the page from xl, below the facts on smaller screens. */}
          <aside className="min-w-0 xl:row-span-2">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 xl:sticky xl:top-16 xl:flex xl:flex-col">
              <BuyBox
                key={variant.id}
                name={product.name}
                variantId={variant.id}
                inStock={data.inStock}
                sellOnline={sellOnline}
                href={canonical}
                pricePaise={variant.sellingPricePaise}
                mrpPaise={variant.mrpPaise}
                weightGrams={variant.weightGrams}
                rates={rates}
                tollFreeNumber={tollFreeNumber}
                price={
                  <div className="max-xl:hidden">
                    <PriceBlock data={data} />
                  </div>
                }
              />
              {!sellOnline && (
                <section
                  aria-label="What we can help with"
                  className="flex flex-col gap-3 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] bg-brand-blue-500 p-5 text-light-100 max-lg:mb-2"
                >
                  <p className="text-body2 font-semibold lg:text-h6">What we can help with</p>
                  <ul className="flex list-disc flex-col gap-2 pl-5 text-body3 text-brand-blue-100 marker:text-light-100 lg:text-body1">
                    <li>Today&apos;s price and availability</li>
                    <li>Choosing the right tool for your work</li>
                    <li>Delivery to your location</li>
                    <li>Workshop and bulk quantities</li>
                  </ul>
                </section>
              )}
              {sellOnline && pageSettings?.bulkEnabled !== false && (
                <section
                  aria-label="Bulk orders"
                  className="flex flex-col gap-3 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] bg-brand-blue-500 p-5 text-light-100 lg:col-span-2 xl:col-span-1"
                >
                  <p className="text-body2 font-semibold lg:text-h6">
                    {pageSettings?.bulkTitle || 'Buying for a workshop or team?'}
                  </p>
                  <p className="text-body3 text-brand-blue-100 lg:text-body1">
                    {pageSettings?.bulkText ||
                      "Message us with the quantity you need and we'll get back to you."}
                  </p>
                  <EnquireButton
                    productName={product.name}
                    href={canonical}
                    className="h-10 w-full text-body3 lg:text-body1"
                  />
                </section>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-5">
            {glance && <div className={wideGlance ? undefined : 'lg:hidden'}>{glance}</div>}

            <SectionNav sections={sections} />

            {hasOverview && (
              <Reveal>
                <Panel id="overview" title="Overview">
                  <div className={cn('grid gap-6', hasFeatures && about && 'lg:grid-cols-2')}>
                    {hasFeatures && (
                      <div className="flex flex-col gap-3">
                        <h3 className="text-body2 font-semibold text-dark-500 lg:text-h5">
                          Key features
                        </h3>
                        <Prose data={product.keyFeatures as RichTextData} />
                      </div>
                    )}
                    {about && (
                      <div className="flex flex-col gap-3">
                        <h3 className="text-body2 font-semibold text-dark-500 lg:text-h5">
                          About this product
                        </h3>
                        {about}
                      </div>
                    )}
                  </div>
                </Panel>
              </Reveal>
            )}

            <Reveal>
              <Panel id="specifications" title="Specifications">
                <dl className="grid overflow-hidden rounded-xl border-[0.5px] border-dark-100 lg:grid-cols-2">
                  {attributes.map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-[45%_1fr] border-b-[0.5px] border-dark-100 text-body3 lg:text-h6 lg:odd:border-r-[0.5px]"
                    >
                      <dt className="bg-light-500 px-3 py-2.5 text-dark-400">{row.label}</dt>
                      <dd className="px-3 py-2.5 font-medium break-words text-dark-500">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {data.userManualUrl && (
                  <a
                    href={data.userManualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body3 font-medium text-brand-blue-400 underline lg:text-h6"
                  >
                    Download the user manual (PDF)
                  </a>
                )}
              </Panel>
            </Reveal>

            <ContentSections sections={contentSections} />

            {hasText(product.warrantyInfo) && (
              <Reveal>
                <Panel title="Warranty Information">
                  <Prose data={product.warrantyInfo} />
                </Panel>
              </Reveal>
            )}

            {care.length > 0 && (
              <Reveal>
                <Panel id="using" title="Using it">
                  <div className="grid gap-5 lg:grid-cols-3">
                    {care.map(({ key, title, field }) => (
                      <div key={key} className="flex flex-col gap-3 rounded-xl bg-light-300 p-4">
                        <h3 className="text-body2 font-semibold text-dark-500 lg:text-h5">
                          {title}
                        </h3>
                        {hasText(field) && <Prose data={field} />}
                      </div>
                    ))}
                  </div>
                </Panel>
              </Reveal>
            )}

            {data.applications.items.length > 0 && (
              <Reveal>
                <div className="[&_img]:transition-transform [&_img]:duration-500 [&_li:hover_img]:scale-105 [&_li_p]:bg-dark-500">
                  <Applications {...data.applications} />
                </div>
              </Reveal>
            )}

            <Reveal>
              <div
                id="customer-reviews"
                className="scroll-mt-16 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100 p-4 lg:p-6"
              >
                <ReviewsSection data={data} />
              </div>
            </Reveal>

            <Reveal>
              <Panel id="faqs" title="Questions shoppers ask">
                <Accordion type="single" collapsible defaultValue={faqs[0]?.q}>
                  {faqs.map((faq) => (
                    <AccordionItem
                      key={faq.q}
                      value={faq.q}
                      className="border-b-[0.5px] border-dark-100 py-1"
                    >
                      <AccordionTrigger className="text-left text-body3 font-medium text-dark-500 lg:text-h6">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="pt-1 pb-3 text-body3 text-dark-400 lg:text-h6">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Panel>
            </Reveal>

            {(data.brochure || data.supplierImages.length > 0) && (
              <Reveal>
                <div className="flex flex-col gap-4">
                  {data.brochure ? (
                    <SupplierBrochure brochure={data.brochure} />
                  ) : (
                    <section aria-label="Product Description From the Supplier">
                      <h2 className="text-body2 font-medium text-dark-500">
                        Product Description From the Supplier
                      </h2>
                    </section>
                  )}
                  {data.supplierImages.length > 0 && (
                    <SupplierImages images={data.supplierImages} name={product.name} />
                  )}
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {data.compare && (
          <Reveal>
            <CompareTable compare={data.compare} />
          </Reveal>
        )}
        {data.promoImages.length > 0 && <FeatureBanners images={data.promoImages} />}
        <RecentlyViewed excludeId={product.id} />
      </div>
    </main>
  )
}
