import { z } from 'zod'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { recordEnquiry } from '@/lib/product-demand'
import { LIMITS } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'
import { guardMutation } from '@/lib/request-security'
import { getPayloadClient } from '@/lib/storefront/queries'

const enquirySchema = z.object({ slug: z.string().trim().min(1).max(200) })

/** Called as a shopper leaves for WhatsApp. Only feeds the count on the product page. */
export const POST = async (request: Request) => {
  const denied = await guardMutation(request, 'productEnquiry', LIMITS.productEnquiry)
  if (denied) return denied
  const parsed = enquirySchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)
  const payload = await getPayloadClient()
  try {
    await recordEnquiry(payload, parsed.data.slug, {
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent') ?? '',
    })
    return ok()
  } catch (err) {
    payload.logger.error({ err }, 'Could not record a product enquiry')
    return fail(500, 'We could not record that.')
  }
}
