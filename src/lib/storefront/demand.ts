import { unstable_cache } from 'next/cache'

import { demandLine } from '@/lib/demand-line'
import { enquiryCount, soldCounts } from '@/lib/product-demand'
import { CACHE_VERSION, STOREFRONT_TAG } from '@/lib/revalidate'
import { getPayloadClient } from '@/lib/storefront/queries'

const load = async (productId: number, sellOnline: boolean): Promise<string | null> => {
  const payload = await getPayloadClient()
  try {
    return demandLine(
      sellOnline
        ? { kind: 'sold', ...(await soldCounts(payload, productId)) }
        : { kind: 'enquiries', last7Days: await enquiryCount(payload, productId) },
    )
  } catch (err) {
    // A nice-to-have: failing to count must never take the product page down.
    payload.logger.error({ err, productId }, 'Could not read product demand')
    return null
  }
}

/** Cached for five minutes, close enough to live for a line that's only ever a rough signal. */
export const getDemandLine = unstable_cache(load, ['product-demand', CACHE_VERSION], {
  tags: [STOREFRONT_TAG],
  revalidate: 300,
})
