import type { Metadata } from 'next'
import React from 'react'

import { StorefrontDocument } from '@/components/layout/StorefrontDocument'
import { siteUrl } from '@/lib/site-url'
import { getSiteSettings } from '@/lib/storefront/queries'

import './styles.css'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    // Unset, Next falls back to the deployment's own URL, which beats siteUrl()'s localhost default.
    ...(process.env.NEXT_PUBLIC_SITE_URL && { metadataBase: new URL(siteUrl()) }),
    title: { default: settings.siteName, template: `%s | ${settings.siteName}` },
    description:
      'Premium power tools, machinery and accessories for professionals, industries and DIY enthusiasts.',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontDocument>{children}</StorefrontDocument>
}
