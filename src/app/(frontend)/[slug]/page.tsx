import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { getPayloadClient } from '@/lib/storefront/queries'

type RichTextData = Parameters<typeof RichText>[0]['data']

/** A published page by slug, once per request. */
const getPage = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
})

export async function generateMetadata(props: PageProps<'/[slug]'>): Promise<Metadata> {
  const page = await getPage((await props.params).slug)
  return page ? { title: page.title, description: page.metaDescription ?? undefined } : {}
}

/** About Us, the policies and any other page staff write under Storefront → Pages. */
export default async function ContentPage(props: PageProps<'/[slug]'>) {
  const page = await getPage((await props.params).slug)
  if (!page) notFound()

  return (
    <main className="bg-light-400 pb-10">
      <div className="container-page flex flex-col gap-4 pt-6">
        <Breadcrumbs items={[{ label: page.title }]} />
        <article className="flex flex-col gap-6 rounded-lg bg-light-100 px-5 py-8 md:px-10 md:py-10">
          <h1 className="text-h4 font-semibold text-dark-500 md:text-h3">{page.title}</h1>
          <RichText
            data={page.content as RichTextData}
            className="flex max-w-[50rem] flex-col gap-4 text-body2 text-dark-400 md:text-body1 [&_a]:text-brand-blue-400 [&_a]:underline [&_h2]:mt-4 [&_h2]:text-h5 [&_h2]:font-semibold [&_h2]:text-dark-500 [&_h3]:mt-2 [&_h3]:text-h6 [&_h3]:font-semibold [&_h3]:text-dark-500 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:text-dark-500 [&_ul]:list-disc [&_ul]:pl-6"
          />
          <p className="text-body3 text-dark-300">
            Last updated{' '}
            {new Date(page.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </article>
      </div>
    </main>
  )
}
