import { FileText } from 'lucide-react'
import { redirect } from 'next/navigation'

import { ButtonLink } from '@/components/ui/button'
import { fileUrlOf } from '@/lib/storefront/content'
import { getSiteSettings } from '@/lib/storefront/queries'

/**
 * /catalogue and /price-list: straight to the PDF staff uploaded under
 * Header & Footer → Downloads. Until there is one, a page that offers it on
 * WhatsApp instead of a dead link.
 */
export const DownloadPage = async ({ file, title }: { file: 'catalogueFile' | 'priceListFile'; title: string }) => {
  const settings = await getSiteSettings()
  const url = fileUrlOf(settings[file])
  if (url) redirect(url)

  const whatsapp = settings.whatsappNumber?.replace(/\D/g, '')
  const text = encodeURIComponent(`Hi, please send me your latest ${title.toLowerCase()}.`)

  return (
    <main className="bg-light-400 pb-10">
      <section className="container-page flex flex-col items-center gap-4 pt-16 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-brand-blue-100 text-brand-blue-500">
          <FileText className="size-10" strokeWidth={1.25} aria-hidden />
        </span>
        <h1 className="text-h4 font-semibold text-dark-500">{title}</h1>
        <p className="max-w-[35rem] text-label1 text-dark-300">
          Our latest {title.toLowerCase()} is being updated. Message us and we’ll send you a copy right away.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {whatsapp && (
            <ButtonLink href={`https://wa.me/${whatsapp}?text=${text}`} variant="blue" className="h-12.5 w-58" target="_blank" rel="noopener noreferrer">
              Ask on WhatsApp
            </ButtonLink>
          )}
          <ButtonLink href="/products" variant="outline" className="h-12.5 w-58">
            Browse Products
          </ButtonLink>
        </div>
      </section>
    </main>
  )
}
