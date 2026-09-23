import type { PayloadHandler } from 'payload'
import { z } from 'zod'

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(['PACKED', 'SHIPPED']),
})

/**
 * Bulk status transition for the custom Orders list view.
 * Mounted at POST /api/orders/bulk-status.
 */
export const bulkOrderStatus: PayloadHandler = async (req) => {
  const role = (req.user as { role?: string } | null)?.role
  if (!role || !['SUPER_ADMIN', 'MANAGER'].includes(role)) {
    return Response.json({ error: 'Not permitted.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json?.())
  if (!parsed.success) {
    return Response.json({ error: 'Send a status of PACKED or SHIPPED and at least one order id.' }, { status: 400 })
  }

  const { ids, status } = parsed.data

  // Only advance orders that are actually in the preceding state, so a stale
  // browser tab cannot walk a delivered order backwards.
  const requiredCurrent = status === 'PACKED' ? 'CONFIRMED' : 'PACKED'

  const result = await req.payload.update({
    collection: 'orders',
    where: { and: [{ id: { in: ids } }, { status: { equals: requiredCurrent } }] },
    data: {
      status,
      ...(status === 'SHIPPED' ? { shippedAt: new Date().toISOString() } : {}),
    },
    req,
  })

  const updated = result.docs?.length ?? 0

  return Response.json({
    updated,
    skipped: ids.length - updated,
    status,
  })
}
