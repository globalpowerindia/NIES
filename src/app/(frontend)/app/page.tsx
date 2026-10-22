import { Smartphone } from 'lucide-react'
import type { Metadata } from 'next'

import { AppPromo } from '@/components/sections/AppPromo'
import { ButtonLink } from '@/components/ui/button'
import { mediaOf } from '@/lib/storefront/content'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Download the App' }

/**
 * "Download App" in the top bar and the account menu. Shows the homepage's
 * app section (Homepage → App promo), whose store links staff already manage.
 */
export default async function AppPage() {
  const payload = await getPayloadClient()
  const home = await payload.findGlobal({ slug: 'home-page', depth: 1 })
  const promo = (home.sections ?? []).find((section) => section.blockType === 'appPromo')
  const hasLinks = promo && promo.blockType === 'appPromo' && (promo.googlePlayUrl || promo.appStoreUrl)

  return (
    <main className="bg-light-400 pb-10">
      <div className="container-page pt-6">
        {hasLinks && promo.blockType === 'appPromo' ? (
          <AppPromo
            title={promo.title ?? undefined}
            description={promo.description ?? undefined}
            screenshot={mediaOf(promo.screenshot)}
            googlePlayUrl={promo.googlePlayUrl}
            appStoreUrl={promo.appStoreUrl}
          />
        ) : (
          <section className="flex flex-col items-center gap-4 pt-10 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-brand-blue-100 text-brand-blue-500">
              <Smartphone className="size-10" strokeWidth={1.25} aria-hidden />
            </span>
            <h1 className="text-h4 font-semibold text-dark-500">Our app is coming soon</h1>
            <p className="max-w-[35rem] text-label1 text-dark-300">
              Until then, everything works right here on the website, on your phone or computer.
            </p>
            <ButtonLink href="/products" variant="blue" className="h-12.5 w-58">
              Browse Products
            </ButtonLink>
          </section>
        )}
      </div>
    </main>
  )
}
