import type { Metadata } from 'next'
import Image from 'next/image'
import React from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { fileUrlOf, hrefOf, mediaOf, type MediaInfo } from '@/lib/storefront/content'
import { getSiteSettings } from '@/lib/storefront/queries'

import './styles.css'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: { default: settings.siteName, template: `%s | ${settings.siteName}` },
    description:
      'Premium power tools, machinery and accessories for professionals, industries and DIY enthusiasts.',
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const logoUrl = mediaOf(settings.logo)?.url ?? '/brand/logo.png'

  const utilityLinks = (settings.utilityLinks ?? []).flatMap((item) => {
    const file = fileUrlOf(item.file)
    const href = file ?? hrefOf(item.link)
    return href ? [{ label: item.label, href, icon: item.icon ?? 'book', download: Boolean(file) }] : []
  })

  const categories = (settings.navCategories ?? []).flatMap((category) =>
    typeof category === 'object' && category.isActive !== false
      ? [{ label: category.name, href: `/category/${category.slug}` }]
      : [],
  )

  const columns = (settings.footerColumns ?? []).map((column) => ({
    heading: column.heading,
    links: (column.links ?? []).flatMap((link) => {
      const href = hrefOf(link.link)
      return href ? [{ label: link.label, href }] : []
    }),
  }))

  const certifications = (settings.certifications ?? [])
    .map(mediaOf)
    .filter((media): media is MediaInfo => media !== null)

  const whatsapp = settings.whatsappNumber?.replace(/\D/g, '')

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header
          siteName={settings.siteName}
          logoUrl={logoUrl}
          offers={(settings.offers ?? []).map((offer) => offer.text)}
          utilityLinks={utilityLinks}
          categories={categories}
          cartCount={0}
        />
        <div className="flex-1">{children}</div>
        <Footer
          siteName={settings.siteName}
          logoUrl={logoUrl}
          columns={columns}
          socials={(settings.socialLinks ?? []).map(({ platform, url }) => ({ platform, url }))}
          tollFreeNumber={settings.tollFreeNumber ?? ''}
          certifications={certifications}
          paymentImage={mediaOf(settings.paymentMethodsImage)}
        />
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="fixed right-6 bottom-6 z-40 grid size-[60px] place-items-center rounded-md bg-[#25d366] shadow-lg transition-transform hover:scale-105"
          >
            <Image src="/icons/social-whatsapp.svg" alt="" width={34} height={34} className="brightness-0 invert" />
          </a>
        )}
      </body>
    </html>
  )
}
