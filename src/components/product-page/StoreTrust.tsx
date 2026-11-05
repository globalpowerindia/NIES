import Image from 'next/image'
import Link from 'next/link'

import type { SiteSetting } from '@/payload-types'

import { CountUp } from './CountUp'
import { TrustPromises, type TrustPromise } from './TrustPromises'

export type StoreStats = { products: number; categories: number; brands: number }

/** The shop's own illustrations. They're detailed, so they need room to read. */
const SiteIcon = ({ name }: { name: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={`/icons/${name}.svg`}
    alt=""
    width={40}
    height={40}
    className="size-9 shrink-0 lg:size-11"
  />
)

/** Live counts, rounded down so a figure is never overstated: 424 reads "400+". */
const roundedDown = (count: number) => {
  if (count >= 100) return { value: Math.floor(count / 100) * 100, suffix: '+' }
  if (count >= 10) return { value: Math.floor(count / 10) * 10, suffix: '+' }
  return { value: count, suffix: '' }
}

/**
 * Why buy from the shop. Figures are counted from the live catalogue, and each
 * promise is one the shop's checkout or policy pages already make, so nothing
 * here needs to be kept up to date by hand.
 */
export const StoreTrust = ({
  siteName,
  logoUrl,
  stats,
  warrantyMonths,
  sellOnline,
  hasInvoice,
  tollFreeNumber,
  settings,
}: {
  siteName: string
  logoUrl: string | null
  stats: StoreStats
  warrantyMonths?: number | null
  sellOnline: boolean
  /** Whether the tax invoice details are filled in, so customers can really download one. */
  hasInvoice: boolean
  tollFreeNumber?: string | null
  /** Header & Footer → Product page. Anything left empty uses the standard wording. */
  settings?: SiteSetting['productPage']
}) => {
  const figures = [
    { value: stats.products, label: 'Products' },
    { value: stats.categories, label: 'Categories' },
    { value: stats.brands, label: 'Brands' },
  ].filter((figure) => figure.value > 0)

  const custom = settings?.promises ?? []
  const general: TrustPromise[] =
    custom.length > 0
      ? custom.map((promise, index) => ({
          key: promise.id ?? String(index),
          // The "verified" choice shows the shield drawn to match the rest of the set.
          icon: <SiteIcon name={promise.icon === 'verified' ? 'warranty' : promise.icon} />,
          label: promise.title,
          detail: (
            <>
              {promise.detail}{' '}
              {promise.linkLabel && promise.linkHref && (
                <Link href={promise.linkHref}>{promise.linkLabel}</Link>
              )}
            </>
          ),
        }))
      : [
          {
            key: 'genuine',
            icon: <SiteIcon name="quality" />,
            label: 'Genuine Products',
            detail: 'Sourced from brands and authorised distributors.',
          },
          ...(sellOnline
            ? [
                {
                  key: 'payment',
                  icon: <SiteIcon name="payment" />,
                  label: 'Secure Payments',
                  detail: 'Pay by UPI, card, netbanking or wallet through Razorpay.',
                },
              ]
            : []),
          {
            key: 'returns',
            icon: <SiteIcon name="trust" />,
            label: 'Returns & Refunds',
            detail: (
              <>
                Cancel for a full refund any time before dispatch.{' '}
                <Link href="/returns">Read the policy</Link>
              </>
            ),
          },
          {
            key: 'help',
            icon: <SiteIcon name="help" />,
            label: 'Talk to Us',
            detail: tollFreeNumber ? (
              <>
                Help choosing the right tool before you buy.{' '}
                <a href={`tel:${tollFreeNumber.replace(/\s/g, '')}`}>{tollFreeNumber}</a>
              </>
            ) : (
              'Help choosing the right tool before you buy, on WhatsApp.'
            ),
          },
        ]

  const promises: TrustPromise[] = [
    ...general,
    ...(warrantyMonths
      ? [
          {
            key: 'warranty',
            icon: <SiteIcon name="warranty" />,
            label: `${warrantyMonths} Months Warranty`,
            detail: 'Manufacturer warranty against manufacturing defects.',
          },
        ]
      : []),
    ...(hasInvoice
      ? [
          {
            key: 'invoice',
            icon: <SiteIcon name="invoice" />,
            label: 'GST Invoice',
            detail: 'Download it from your order, and claim input tax credit for your business.',
          },
        ]
      : []),
  ]

  return (
    <section
      aria-label={`Why buy from ${siteName}`}
      className="overflow-hidden rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100"
    >
      <div className="flex items-center justify-center gap-2 px-4 pt-4">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt=""
            width={147}
            height={58}
            className="h-9 w-auto object-contain lg:h-11"
          />
        )}
        <p className="text-body2 font-semibold text-dark-500 lg:text-h5">Why buy from {siteName}</p>
      </div>

      <div className="relative mx-3 mt-6 rounded-xl bg-light-300 px-2 pt-7 pb-3 lg:mx-4">
        <p className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border-[0.5px] border-dark-200 bg-light-100 px-3 py-1 text-label3 font-medium whitespace-nowrap text-dark-500 lg:text-body1">
          {settings?.trustBadge || 'Kerala based tools supplier'}
        </p>
        <dl className="grid grid-cols-3 gap-1 text-center">
          {figures.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center px-1 py-1.5">
              <dd className="order-1 text-h6 font-bold text-green-400 lg:text-h4">
                <CountUp {...roundedDown(value)} />
              </dd>
              <dt className="order-2 text-label3 text-dark-400 lg:text-body1">{label}</dt>
            </div>
          ))}
          {(settings?.extraStats ?? []).map((stat) => (
            <div key={stat.id ?? stat.label} className="flex flex-col items-center px-1 py-1.5">
              <dd className="order-1 text-h6 font-bold text-green-400 lg:text-h4">{stat.value}</dd>
              <dt className="order-2 text-label3 text-dark-400 lg:text-body1">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4">
        <TrustPromises promises={promises} />
      </div>
    </section>
  )
}
