import { Copyright, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import type { MediaInfo } from '@/lib/storefront/content'

const DEFAULT_LINK_COLUMNS = [
  {
    heading: 'Information',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Delivery Information', href: '/delivery' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Return Policy', href: '/returns' },
      { label: 'Terms & Conditions', href: '/terms' },
    ],
  },
  {
    heading: 'Top Categories',
    links: [
      { label: 'Gold Power Tools', href: '/category/gold-power-tools' },
      { label: 'HCC Power Tools', href: '/category/hcc-power-tools' },
      { label: 'Cordless Tools', href: '/category/cordless-tools' },
      { label: 'Pressure Wash', href: '/category/pressure-wash' },
      { label: 'Welding Machines', href: '/category/welding-machines' },
      { label: 'Air Compressor', href: '/category/air-compressor' },
      { label: 'All Products', href: '/products' },
    ],
  },
  {
    heading: 'My Account',
    links: [
      { label: 'My Profile', href: '/account/profile' },
      { label: 'Order History', href: '/account/orders' },
      { label: 'Wishlist', href: '/account/wishlist' },
    ],
  },
]

const SOCIAL_ICONS = {
  facebook: { label: 'Facebook', icon: '/icons/social-facebook.svg', width: 14, height: 25 },
  instagram: { label: 'Instagram', icon: '/icons/social-instagram.svg', width: 21, height: 21 },
  whatsapp: { label: 'WhatsApp', icon: '/icons/social-whatsapp.svg', width: 25, height: 25 },
  youtube: { label: 'YouTube', icon: '/icons/social-youtube.svg', width: 32, height: 21 },
} as const

const CERT_HEIGHT = 48

export type FooterProps = {
  siteName: string
  logoUrl: string
  columns: { heading: string; links: { label: string; href: string }[] }[]
  socials: { platform: keyof typeof SOCIAL_ICONS; url: string }[]
  tollFreeNumber: string
  certifications: MediaInfo[]
  paymentImage: MediaInfo | null
}

export const Footer = ({
  siteName,
  logoUrl,
  columns,
  socials,
  tollFreeNumber,
  certifications,
  paymentImage,
}: FooterProps) => (
  <footer className="bg-light-100 pt-20 pb-10">
    <div className="container-page flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-10">
        <Link href="/">
          <Image
            src={logoUrl}
            alt={siteName}
            width={147}
            height={58}
            className="h-[58px] w-auto object-contain"
          />
        </Link>

        {(columns.length ? columns : DEFAULT_LINK_COLUMNS).map((column) => (
          <div key={column.heading} className="flex flex-col gap-[11px]">
            <p className="px-3 text-body1 font-medium text-dark-500">{column.heading}</p>
            <ul className="flex flex-col justify-center">
              {column.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="block px-5 py-4 text-body2 whitespace-nowrap text-dark-500 transition-colors hover:text-brand-red-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex flex-col gap-[11px]">
          <p className="px-3 text-body1 font-medium text-dark-500">Follow Us On</p>
          <ul className="flex h-[55px] items-center gap-7 px-2.5">
            {socials.map(({ platform, url }) => {
              const social = SOCIAL_ICONS[platform]
              return (
                <li key={`${platform}-${url}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={social.label}
                    className="block transition-opacity hover:opacity-70"
                  >
                    <Image
                      src={social.icon}
                      alt=""
                      width={social.width}
                      height={social.height}
                      style={{ width: social.width, height: social.height }}
                    />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <hr className="border-t border-neutral-300" />

      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-light-100 p-3">
        <a href={`tel:${tollFreeNumber.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2">
          <span className="grid h-full min-h-[64px] w-[70px] place-items-center rounded-full bg-brand-blue-400 text-light-100">
            <Phone className="size-6" strokeWidth={1.5} />
          </span>
          <span className="flex flex-col items-start">
            <span className="px-3 text-body1 text-dark-400">Toll Free Number</span>
            <span className="px-3 py-1 text-h5 font-semibold text-dark-500">{tollFreeNumber}</span>
          </span>
        </a>

        <ul className="flex flex-wrap items-center gap-8">
          {certifications.map((cert) => {
            const width =
              cert.width && cert.height ? Math.round((CERT_HEIGHT * cert.width) / cert.height) : CERT_HEIGHT
            return (
              <li key={cert.url}>
                <Image
                  src={cert.url}
                  alt={cert.alt}
                  width={width}
                  height={CERT_HEIGHT}
                  style={{ width, height: CERT_HEIGHT }}
                  className="object-contain"
                />
              </li>
            )
          })}
        </ul>

        {paymentImage && (
          <div className="flex flex-col items-start gap-1">
            <p className="text-body1 text-dark-400">Payment</p>
            <Image
              src={paymentImage.url}
              alt={paymentImage.alt || 'Accepted payment methods'}
              width={316}
              height={37}
              style={{ width: 316, height: 37 }}
              className="object-contain"
            />
          </div>
        )}
      </div>

      <hr className="border-t border-neutral-300" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-1 text-body3 text-dark-500">
          <Copyright className="size-[18px]" strokeWidth={1.5} />
          <span>
            {new Date().getFullYear()} <span className="text-brand-red-500">{siteName}</span> . All Rights
            Reserved
          </span>
        </p>
        <p className="text-body3 text-dark-500">
          Designed &amp; Developed by <span className="font-medium text-brand-red-500">mits</span>
        </p>
      </div>
    </div>
  </footer>
)
