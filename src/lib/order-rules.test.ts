import { describe, expect, it } from 'vitest'

import { staffCanMoveOrder, statusEmailFor } from '@/lib/order-rules'

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
