import type { Payload } from 'payload'

import type { AddressCardData } from '@/components/account/AddressCard'
import type { AddressFormValues } from '@/components/account/AddressForm'
import type { OrderStatus } from '@/collections/Orders'
import { stateName } from '@/lib/indian-states'
import { displayPhone } from '@/lib/phone'
import { mediaOf } from '@/lib/storefront/content'
import { loadPricing, PLACEHOLDER_IMAGE } from '@/lib/storefront/products'
import type { Address, Customer, Product } from '@/payload-types'

/**
 * Reads for the account pages. Every query is scoped to the customer passed
 * in, which callers take from the session — never from the request.
 */

export const addressLines = (
  address: Pick<Address, 'line1' | 'line2' | 'city' | 'stateCode' | 'pincode'>,
) => [
  address.line1,
  address.line2,
  `${address.city}, ${stateName(address.stateCode)} - ${address.pincode}`,
]

export const getAddresses = async (
  payload: Payload,
  customerId: number,
): Promise<AddressCardData[]> => {
  const result = await payload.find({
    collection: 'addresses',
    where: { customer: { equals: customerId } },
    sort: '-updatedAt',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return result.docs.map((address) => ({
    id: address.id,
    fullName: address.fullName,
    phone: displayPhone(address.phone),
    type: address.type,
    lines: addressLines(address),
  }))
}

/** One address as form values, or null when it isn't this customer's. */
export const getAddressForEdit = async (
  payload: Payload,
  customerId: number,
  id: number,
): Promise<AddressFormValues | null> => {
  const result = await payload.find({
    collection: 'addresses',
    where: { and: [{ id: { equals: id } }, { customer: { equals: customerId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const address = result.docs[0]
  if (!address) return null
  return {
    fullName: address.fullName,
    phone: displayPhone(address.phone),
    pincode: address.pincode,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    stateCode: address.stateCode,
    type: address.type,
  }
}

/** A blank form, with the customer's own name and number filled in. */
export const newAddressValues = (customer: Customer): AddressFormValues => ({
  fullName: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
  phone: customer.phone ? displayPhone(customer.phone) : '',
  pincode: '',
  line1: '',
  line2: '',
  city: '',
  stateCode: '',
  type: 'HOME',
})

export type WishlistEntry = {
  productId: number
  href: string
  name: string
  subtitle: string | null
  imageUrl: string
  imageAlt: string
  pricePaise: number | null
  mrpPaise: number | null
}

export const getWishlist = async (
  payload: Payload,
  customerId: number,
): Promise<WishlistEntry[]> => {
  const items = await payload.find({
    collection: 'wishlist-items',
    where: { customer: { equals: customerId } },
    sort: '-createdAt',
    pagination: false,
    depth: 2,
    overrideAccess: true,
  })
  // Archived or deleted products drop off rather than show a dead card.
  const products = items.docs
    .map((item) => item.product)
    .filter(
      (product): product is Product => typeof product === 'object' && product?.status === 'ACTIVE',
    )
  const pricing = await loadPricing(
    payload,
    products.map((product) => product.id),
  )

  return products.map((product) => {
    const image = mediaOf(product.images?.[0])
    const variant = pricing.get(product.id)?.variant
    return {
      productId: product.id,
      href: `/products/${product.slug}`,
      name: product.name,
      subtitle: product.subtitle ?? null,
      imageUrl: image?.url ?? PLACEHOLDER_IMAGE,
      imageAlt: image?.alt || product.name,
      pricePaise: variant?.sellingPricePaise ?? null,
      mrpPaise: variant?.mrpPaise ?? null,
    }
  })
}

/** The tracker's steps. Confirmed and Packed both still read as "Order Placed". */
export const ORDER_STEPS = ['Order Placed', 'Shipped', 'Out for Delivery', 'Delivered'] as const

const STEP_REACHED: Partial<Record<OrderStatus, number>> = {
  CONFIRMED: 0,
  PACKED: 0,
  SHIPPED: 1,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
}

const ACTIVE: OrderStatus[] = ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY']
const PAST: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'RETURNED']

export type OrderLine = {
  key: string
  orderNumber: string
  status: OrderStatus
  placedAt: string
  shippedAt: string | null
  /** Index into ORDER_STEPS of the last step reached; -1 for cancelled or returned. */
  step: number
  name: string
  subtitle: string | null
  href: string | null
  imageUrl: string
  imageAlt: string
  unitPricePaise: number
  quantity: number
}

/**
 * The customer's orders, one line per item, as the design shows them.
 * Unpaid orders are left out: until payment they are a checkout, not an order.
 */
export const getOrderLines = async (
  payload: Payload,
  customerId: number,
  tab: 'active' | 'past',
): Promise<OrderLine[]> => {
  const orders = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { customer: { equals: customerId } },
        { status: { in: tab === 'active' ? ACTIVE : PAST } },
      ],
    },
    sort: '-placedAt',
    limit: 50,
    depth: 2,
    overrideAccess: true,
  })

  return orders.docs.flatMap((order) =>
    (order.items ?? []).map((item, index) => {
      const product = typeof item.product === 'object' && item.product ? item.product : null
      const image = mediaOf(product?.images?.[0])
      return {
        key: `${order.id}-${item.id ?? index}`,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt,
        shippedAt: order.shippedAt ?? null,
        step: STEP_REACHED[order.status] ?? -1,
        name: item.productName,
        subtitle: product?.subtitle ?? null,
        href: product && product.status === 'ACTIVE' ? `/products/${product.slug}` : null,
        imageUrl: image?.url ?? PLACEHOLDER_IMAGE,
        imageAlt: image?.alt || item.productName,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
      }
    }),
  )
}
