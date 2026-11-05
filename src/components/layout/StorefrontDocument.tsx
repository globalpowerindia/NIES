import Image from 'next/image'
import type { ReactNode } from 'react'

import { CartToast } from '@/components/cart/CartToast'
import { EnquiryProvider } from '@/components/enquiry/EnquireButton'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { PageViewTracker } from '@/components/layout/PageViewTracker'
import { getCategoryTree } from '@/lib/storefront/catalog'
import { fileUrlOf, hrefOf, mediaOf, type MediaInfo } from '@/lib/storefront/content'
import { getSearchHints, getSiteSettings } from '@/lib/storefront/queries'

/**
 * The storefront's whole document: fonts, header, footer and the WhatsApp
 * button around `children`. The storefront layout renders it, and so does
 * `app/global-not-found.tsx`, which bypasses every layout but should still
 * look like the shop. Both import `(frontend)/styles.css` themselves.
 */
export const StorefrontDocument = async ({ children }: { children: ReactNode }) => {
  const [settings, searchHints, tree] = await Promise.all([
    getSiteSettings(),
    getSearchHints(),
    getCategoryTree(),
  ])
  const logoUrl = mediaOf(settings.logo)?.url ?? '/brand/logo.png'

  const utilityLinks = (settings.utilityLinks ?? []).flatMap((item) => {
    const file = fileUrlOf(item.file)
    const href = file ?? hrefOf(item.link)
    return href ? [{ label: item.label, href, icon: item.icon ?? 'book', download: Boolean(file) }] : []
  })

  const categories = (settings.navCategories ?? []).flatMap((category) =>
    typeof category === 'object' && category.isActive !== false
      ? [
          {
            label: category.name,
            href: `/category/${category.slug}`,
            children: (tree.children.get(category.id) ?? []).map((child) => ({
              label: child.name,
              href: `/category/${child.slug}`,
            })),
          },
        ]
      : [],
  )

  const searchTiles = (settings.topMovingProducts ?? []).flatMap((tile) => {
    const image = mediaOf(tile.image)
    const href = hrefOf(tile.link)
    return image && href ? [{ label: tile.label, href, image }] : []
  })

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
      {/* An App Router document, not pages/: the rule only sees that this file is outside app/. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The rule targets pages/_document; this is the root layout, so the fonts load on every page. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600&family=Manrope:wght@400;500;600&display=swap"
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
          searchTiles={searchTiles}
          searchHints={searchHints}
        />
        <EnquiryProvider whatsapp={whatsapp || null}>
          <div className="flex-1">{children}</div>
        </EnquiryProvider>
        <CartToast />
        <PageViewTracker />
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
            className="fixed right-4 bottom-6 z-40 grid size-[2.5625rem] place-items-center rounded-md bg-[#25d366] shadow-lg transition-transform hover:scale-105 md:right-6 md:size-[3.75rem]"
          >
            <Image src="/icons/social-whatsapp.svg" alt="" width={34} height={34} className="brightness-0 invert" />
          </a>
        )}
      </body>
    </html>
  )
}
