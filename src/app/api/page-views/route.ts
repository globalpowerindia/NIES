import { z } from 'zod'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { LIMITS } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'
import { guardMutation } from '@/lib/request-security'
import { getPayloadClient } from '@/lib/storefront/queries'
import { recordPageView } from '@/lib/traffic'
import { isBot } from '@/lib/traffic-rules'

const pageViewSchema = z.object({
  path: z.string().max(200).regex(/^\/(?!\/)/),
  entry: z.boolean(),
  referrer: z.string().max(500).default(''),
  utmSource: z.string().max(100).default(''),
})

/** Called by the storefront on each page. Feeds the admin's traffic panels and the product page's view count. */
export const POST = async (request: Request) => {
  const denied = await guardMutation(request, 'pageView', LIMITS.pageView)
  if (denied) return denied
  const userAgent = request.headers.get('user-agent') ?? ''
  if (isBot(userAgent)) return ok()
  const parsed = pageViewSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)
  const payload = await getPayloadClient()
  try {
    await recordPageView(payload, {
      ...parsed.data,
      // guardMutation has already refused a request without a matching Origin.
      siteHost: new URL(request.headers.get('origin') ?? request.url).hostname,
      ip: clientIp(request),
      userAgent,
    })
    return ok()
  } catch (err) {
    payload.logger.error({ err }, 'Could not record a page view')
    return fail(500, 'We could not record that.')
  }
}
