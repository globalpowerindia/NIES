import { describe, expect, it } from 'vitest'

import { isSameCheckout, staffCanMoveOrder, statusEmailFor } from '@/lib/order-rules'

describe('staffCanMoveOrder', () => {
  it('follows the fulfilment path forwards', () => {
    expect(staffCanMoveOrder('CONFIRMED', 'PACKED')).toBe(true)
    expect(staffCanMoveOrder('PACKED', 'SHIPPED')).toBe(true)
    expect(staffCanMoveOrder('SHIPPED', 'DELIVERED')).toBe(true)
  })

  it('never lets staff mark an unpaid order as confirmed', () => {
    expect(staffCanMoveOrder('PENDING_PAYMENT', 'CONFIRMED')).toBe(false)
  })

  it('does not walk an order backwards or skip packing', () => {
    expect(staffCanMoveOrder('DELIVERED', 'SHIPPED')).toBe(false)
    expect(staffCanMoveOrder('CONFIRMED', 'SHIPPED')).toBe(false)
  })

  it('treats cancelled and returned as final', () => {
    expect(staffCanMoveOrder('CANCELLED', 'CONFIRMED')).toBe(false)
    expect(staffCanMoveOrder('RETURNED', 'DELIVERED')).toBe(false)
  })

  it('allows saving without a status change', () => {
    expect(staffCanMoveOrder('SHIPPED', 'SHIPPED')).toBe(true)
  })
})

describe('statusEmailFor', () => {
  it('tells the customer each step after the parcel leaves', () => {
    expect(statusEmailFor('PACKED', 'SHIPPED')).toBe('SHIPPED')
    expect(statusEmailFor('SHIPPED', 'OUT_FOR_DELIVERY')).toBe('OUT_FOR_DELIVERY')
    expect(statusEmailFor('OUT_FOR_DELIVERY', 'DELIVERED')).toBe('DELIVERED')
    expect(statusEmailFor('DELIVERED', 'RETURNED')).toBe('RETURNED')
  })

  it('sends nothing when the status has not changed', () => {
    expect(statusEmailFor('SHIPPED', 'SHIPPED')).toBeNull()
  })

  it('sends nothing for steps the confirmation email already covers', () => {
    expect(statusEmailFor('PENDING_PAYMENT', 'CONFIRMED')).toBeNull()
    expect(statusEmailFor('CONFIRMED', 'PACKED')).toBeNull()
  })

  it('reports a cancellation only for an order that was paid', () => {
    expect(statusEmailFor('CONFIRMED', 'CANCELLED')).toBe('CANCELLED')
    expect(statusEmailFor('PACKED', 'CANCELLED')).toBe('CANCELLED')
    expect(statusEmailFor('PENDING_PAYMENT', 'CANCELLED')).toBeNull()
  })
})

describe('isSameCheckout', () => {
  const order = {
    grandTotalPaise: 100_000,
    customerName: 'Asha',
    customerEmail: 'asha@example.test',
    customerPhone: '+919876543210',
    customerGstin: null,
    shipLine1: '12 MG Road',
    shipLine2: null,
    shipCity: 'Kochi',
    shipPincode: '682001',
    shipStateCode: '32',
    couponCode: null,
    items: [
      { sku: 'A', quantity: 2, unitPricePaise: 30_000 },
      { sku: 'B', quantity: 1, unitPricePaise: 40_000 },
    ],
  }

  it('accepts an identical retry, whatever order the lines are in', () => {
    expect(isSameCheckout(order, { ...order, items: [...order.items].reverse() })).toBe(true)
  })

  it('treats a missing and an empty optional field as the same', () => {
    expect(isSameCheckout(order, { ...order, shipLine2: '', customerGstin: undefined })).toBe(true)
  })

  it('refuses different items at the same total', () => {
    expect(isSameCheckout(order, { ...order, items: [{ sku: 'C', quantity: 1, unitPricePaise: 100_000 }] })).toBe(false)
  })

  it('refuses the same items in different quantities or at different prices', () => {
    const items = [
      { sku: 'A', quantity: 1, unitPricePaise: 60_000 },
      { sku: 'B', quantity: 1, unitPricePaise: 40_000 },
    ]
    expect(isSameCheckout(order, { ...order, items })).toBe(false)
  })

  it.each([
    ['a GSTIN added on retry', { customerGstin: '32ABCDE1234F1Z5' }],
    ['a corrected email', { customerEmail: 'other@example.test' }],
    ['a different phone', { customerPhone: '+919000000000' }],
    ['a different name', { customerName: 'Ravi' }],
    ['a different second address line', { shipLine2: 'Flat 4' }],
    ['a different city', { shipCity: 'Thrissur' }],
    ['a different state', { shipStateCode: '29' }],
    ['a coupon', { couponCode: 'SAVE10' }],
    ['a different total', { grandTotalPaise: 100_001 }],
  ])('refuses %s', (_label, change) => {
    expect(isSameCheckout(order, { ...order, ...change })).toBe(false)
  })
})
