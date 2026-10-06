import { describe, expect, it } from 'vitest'

import { staffCanMoveOrder } from '@/lib/order-rules'

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
