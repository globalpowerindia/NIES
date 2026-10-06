import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { findOrCreateCart } from '@/lib/storefront/cart'
import config from '@/payload.config'

let payload: Payload
const customers: number[] = []

describe('Cart', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of customers) {
      await payload.delete({ collection: 'carts', where: { customer: { equals: id } }, overrideAccess: true })
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    }
  })

  it('gives a customer one cart when ten first adds arrive at once', async () => {
    const customer = await payload.create({
      collection: 'customers',
      data: { email: `cart-${Date.now()}@example.test`, status: 'ACTIVE' },
      overrideAccess: true,
    })
    customers.push(customer.id)

    const carts = await Promise.all(Array.from({ length: 10 }, () => findOrCreateCart(payload, customer.id)))
    const { totalDocs } = await payload.count({
      collection: 'carts',
      where: { and: [{ customer: { equals: customer.id } }, { status: { equals: 'ACTIVE' } }] },
      overrideAccess: true,
    })

    expect(new Set(carts.map((cart) => cart.id)).size).toBe(1)
    expect(totalDocs).toBe(1)
  })

  it('refuses a second active cart for the same customer at the database', async () => {
    const customer = await payload.create({
      collection: 'customers',
      data: { email: `cart-index-${Date.now()}@example.test`, status: 'ACTIVE' },
      overrideAccess: true,
    })
    customers.push(customer.id)
    const create = () =>
      payload.create({ collection: 'carts', data: { customer: customer.id, status: 'ACTIVE' }, overrideAccess: true })

    await create()
    await expect(create()).rejects.toThrow()
  })
})
