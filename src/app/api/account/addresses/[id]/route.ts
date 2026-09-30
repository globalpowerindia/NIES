import type { NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { fail, invalid, ok, readJson } from '@/lib/api-response'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { addressSchema } from '@/lib/validations/account'

const NOT_FOUND = 'That address no longer exists.'

/**
 * Whether this address is the customer's own. Someone else's id gets the same
 * answer as a missing one, so ids cannot be probed.
 */
const ownsAddress = async (payload: Payload, customerId: number, id: number): Promise<boolean> => {
  const { totalDocs } = await payload.count({
    collection: 'addresses',
    where: { and: [{ id: { equals: id } }, { customer: { equals: customerId } }] },
    overrideAccess: true,
  })
  return totalDocs > 0
}

const readId = async (ctx: RouteContext<'/api/account/addresses/[id]'>): Promise<number | null> => {
  const id = Number((await ctx.params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Saves changes to one of the signed-in customer's addresses. */
export const POST = async (
  request: Request,
  ctx: RouteContext<'/api/account/addresses/[id]'>,
): Promise<NextResponse> => {
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in again.')

  const id = await readId(ctx)
  const parsed = addressSchema.safeParse(await readJson(request))
  if (!parsed.success) return invalid(parsed.error)

  const payload = await getPayloadClient()
  if (!id || !(await ownsAddress(payload, customer.id, id))) return fail(404, NOT_FOUND)

  await payload.update({ collection: 'addresses', id, data: parsed.data, overrideAccess: true })
  return ok({ id })
}

/** Removes one of the signed-in customer's addresses. Past orders keep their own copy. */
export const DELETE = async (
  _request: Request,
  ctx: RouteContext<'/api/account/addresses/[id]'>,
): Promise<NextResponse> => {
  const customer = await getCurrentCustomer()
  if (!customer) return fail(401, 'Please sign in again.')

  const id = await readId(ctx)
  const payload = await getPayloadClient()
  if (!id || !(await ownsAddress(payload, customer.id, id))) return fail(404, NOT_FOUND)

  await payload.delete({ collection: 'addresses', id, overrideAccess: true })
  return ok()
}
