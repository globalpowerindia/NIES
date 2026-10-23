import { getPayloadClient } from '@/lib/storefront/queries'
import { MODEL_MIME } from '@/lib/product-model'
import { siteUrl } from '@/lib/site-url'

/** WebGL fetches need CORS; serve public model uploads through this origin. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)))
    return new Response('Not found', { status: 404 })
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'media',
    where: { and: [{ id: { equals: Number(id) } }, { mimeType: { equals: MODEL_MIME } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const media = docs[0]
  if (!media?.url) return new Response('Not found', { status: 404 })
  try {
    const upstream = await fetch(new URL(media.url, siteUrl()), {
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })
    if (!upstream.ok || !upstream.body) return new Response('Model unavailable', { status: 502 })
    return new Response(upstream.body, {
      headers: {
        'Content-Type': MODEL_MIME,
        // The page links with ?v=<updatedAt>, so a changed model gets a new URL:
        // the CDN can keep this one and spare the server re-streaming it per visitor.
        'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        ...(upstream.headers.get('content-length')
          ? { 'Content-Length': upstream.headers.get('content-length')! }
          : {}),
      },
    })
  } catch {
    return new Response('Model unavailable', { status: 502 })
  }
}
