import { HomeSections } from '@/components/sections/HomeSections'
import { getHomePage, getPayloadClient } from '@/lib/storefront/queries'

export default async function HomePage() {
  const [payload, home] = await Promise.all([getPayloadClient(), getHomePage()])

  return (
    <main className="container-page flex flex-col">
      {home.sections?.length ? (
        <HomeSections payload={payload} sections={home.sections} />
      ) : (
        <p className="py-40 text-center text-body1 text-dark-300">
          The homepage has no sections yet. Add them under Storefront → Homepage in the admin.
        </p>
      )}
    </main>
  )
}
