import { describe, expect, it } from 'vitest'

import {
  couponCoversLine,
  evaluateCoupon,
  MAX_LINE_QTY,
  mergeCartLines,
  normaliseCouponCode,
  purchasableQuantity,
  type CouponRule,
} from './cart-rules'

const NOW = new Date('2026-10-01T10:00:00Z')
const GUEST = { total: 0, byCustomer: null }
const SIGNED_IN = { total: 0, byCustomer: 0 }

const percent = (bps: number, extra: Partial<CouponRule> = {}): CouponRule => ({
  type: 'PERCENT',
  percentBps: bps,
  isActive: true,
  ...extra,
})

describe('purchasableQuantity', () => {
  it('is what is available, capped per line', () => {
    expect(purchasableQuantity({ available: 3, allowBackorder: false })).toBe(3)
    expect(purchasableQuantity({ available: 500, allowBackorder: false })).toBe(MAX_LINE_QTY)
  })

  it('is zero when nothing is available or there is no stock row', () => {
    expect(purchasableQuantity({ available: 0, allowBackorder: false })).toBe(0)
    expect(purchasableQuantity({ available: -2, allowBackorder: false })).toBe(0)
    expect(purchasableQuantity(undefined)).toBe(0)
  })

  it('ignores stock when backorders are allowed', () => {
    expect(purchasableQuantity({ available: 0, allowBackorder: true })).toBe(MAX_LINE_QTY)
  })
})

describe('mergeCartLines', () => {
  const limit = (limits: Record<number, number>) => (variantId: number) => limits[variantId] ?? 0

  it('adds guest quantities to matching lines, capped by stock', () => {
    const changes = mergeCartLines(
      [{ variantId: 1, quantity: 2 }],
      [
        { variantId: 1, quantity: 5 },
        { variantId: 2, quantity: 1 },
      ],
      limit({ 1: 4, 2: 10 }),
    )
    expect(changes).toEqual([
      { variantId: 1, quantity: 4 },
      { variantId: 2, quantity: 1 },
    ])
  })

  it('never reduces a line the customer already had', () => {
    // Stock fell to 1 after they added 3; the merge must not take 2 away.
    expect(
      mergeCartLines(
        [{ variantId: 1, quantity: 3 }],
        [{ variantId: 1, quantity: 2 }],
        limit({ 1: 1 }),
      ),
    ).toEqual([])
  })

  it('drops guest lines that can no longer be bought', () => {
    expect(mergeCartLines([], [{ variantId: 9, quantity: 1 }], limit({}))).toEqual([])
  })

  it('combines duplicate guest lines before capping', () => {
    expect(
      mergeCartLines(
        [],
        [
          { variantId: 1, quantity: 2 },
          { variantId: 1, quantity: 2 },
        ],
        limit({ 1: 3 }),
      ),
    ).toEqual([{ variantId: 1, quantity: 3 }])
  })
})

describe('evaluateCoupon', () => {
  it('takes a percentage off, rounding down', () => {
    // 10% of ₹999.99 is ₹99.999; the shopper gets ₹99.99, never more than 10%.
    expect(
      evaluateCoupon(percent(1000), { subtotalPaise: 99_999, now: NOW, usage: GUEST }),
    ).toEqual({
      ok: true,
      discountPaise: 9_999,
      freeShipping: false,
    })
  })

  it('caps a percentage at the maximum discount', () => {
    const rule = percent(2000, { maxDiscountPaise: 50_000 })
    expect(evaluateCoupon(rule, { subtotalPaise: 1_000_000, now: NOW, usage: GUEST })).toEqual({
      ok: true,
      discountPaise: 50_000,
      freeShipping: false,
    })
  })

  it('never takes off more than the subtotal', () => {
    const rule: CouponRule = { type: 'FLAT', amountPaise: 100_000, isActive: true }
    expect(evaluateCoupon(rule, { subtotalPaise: 40_000, now: NOW, usage: GUEST })).toEqual({
      ok: true,
      discountPaise: 40_000,
      freeShipping: false,
    })
  })

  it('rejects inactive, early and expired codes', () => {
    const cart = { subtotalPaise: 100_000, now: NOW, usage: GUEST }
    expect(evaluateCoupon(percent(1000, { isActive: false }), cart)).toMatchObject({
      ok: false,
      reason: 'INVALID',
    })
    expect(evaluateCoupon(percent(1000, { startsAt: '2026-10-02T00:00:00Z' }), cart)).toMatchObject(
      {
        ok: false,
        reason: 'NOT_STARTED',
      },
    )
    expect(evaluateCoupon(percent(1000, { endsAt: '2026-10-01T10:00:00Z' }), cart)).toMatchObject({
      ok: false,
      reason: 'EXPIRED',
    })
  })

  it('says how much more is needed for the minimum order', () => {
    const result = evaluateCoupon(percent(1000, { minSubtotalPaise: 500_000 }), {
      subtotalPaise: 350_000,
      now: NOW,
      usage: GUEST,
    })
    expect(result).toMatchObject({ ok: false, reason: 'MIN_SUBTOTAL' })
    expect(!result.ok && result.message).toContain('₹1,500 more')
  })

  it('enforces the overall usage limit', () => {
    expect(
      evaluateCoupon(percent(1000, { usageLimit: 100 }), {
        subtotalPaise: 100_000,
        now: NOW,
        usage: { total: 100, byCustomer: 0 },
      }),
    ).toMatchObject({ ok: false, reason: 'USED_UP' })
  })

  it('asks guests to sign in for a once-per-customer code, then counts their uses', () => {
    const rule = percent(1000, { perCustomerLimit: 1 })
    expect(evaluateCoupon(rule, { subtotalPaise: 100_000, now: NOW, usage: GUEST })).toMatchObject({
      ok: false,
      reason: 'SIGN_IN_REQUIRED',
    })
    expect(
      evaluateCoupon(rule, { subtotalPaise: 100_000, now: NOW, usage: SIGNED_IN }),
    ).toMatchObject({ ok: true })
    expect(
      evaluateCoupon(rule, {
        subtotalPaise: 100_000,
        now: NOW,
        usage: { total: 5, byCustomer: 1 },
      }),
    ).toMatchObject({ ok: false, reason: 'ALREADY_USED' })
  })
})

describe('evaluateCoupon: scope, first order, free delivery', () => {
  const cart = { subtotalPaise: 300_000, now: NOW, usage: SIGNED_IN }

  it('takes a percentage only off the items the code covers', () => {
    const rule = percent(1000, { appliesTo: 'ITEMS' })
    expect(evaluateCoupon(rule, { ...cart, eligibleSubtotalPaise: 100_000 })).toEqual({
      ok: true,
      discountPaise: 10_000,
      freeShipping: false,
    })
  })

  it('never takes a flat amount beyond the covered items', () => {
    const rule: CouponRule = { type: 'FLAT', amountPaise: 50_000, isActive: true, appliesTo: 'ITEMS' }
    expect(evaluateCoupon(rule, { ...cart, eligibleSubtotalPaise: 20_000 })).toMatchObject({ discountPaise: 20_000 })
  })

  it('says so when nothing in the cart is covered', () => {
    expect(evaluateCoupon(percent(1000, { appliesTo: 'ITEMS' }), { ...cart, eligibleSubtotalPaise: 0 })).toMatchObject({
      ok: false,
      reason: 'NOT_ELIGIBLE',
    })
  })

  it('keeps a first-order code for customers with no paid orders', () => {
    const rule = percent(1000, { firstOrderOnly: true })
    expect(evaluateCoupon(rule, { ...cart, firstOrder: null })).toMatchObject({ ok: false, reason: 'SIGN_IN_REQUIRED' })
    expect(evaluateCoupon(rule, { ...cart, firstOrder: false })).toMatchObject({ ok: false, reason: 'NOT_FIRST_ORDER' })
    expect(evaluateCoupon(rule, { ...cart, firstOrder: true })).toMatchObject({ ok: true })
  })

  it('waives delivery instead of taking money off the items', () => {
    const rule: CouponRule = { type: 'FREE_SHIPPING', isActive: true, minSubtotalPaise: 200_000 }
    expect(evaluateCoupon(rule, cart)).toEqual({ ok: true, discountPaise: 0, freeShipping: true })
    expect(evaluateCoupon(rule, { ...cart, subtotalPaise: 100_000 })).toMatchObject({ ok: false, reason: 'MIN_SUBTOTAL' })
  })
})

describe('couponCoversLine', () => {
  const scope = { productIds: [7], categoryIds: [3], brandIds: [9] }

  it('covers a chosen product, a product under a chosen category (at any depth), or a chosen brand', () => {
    expect(couponCoversLine(scope, { productId: 7, categoryIds: [1], brandId: null })).toBe(true)
    expect(couponCoversLine(scope, { productId: 1, categoryIds: [12, 3], brandId: null })).toBe(true)
    expect(couponCoversLine(scope, { productId: 1, categoryIds: [12], brandId: 9 })).toBe(true)
    expect(couponCoversLine(scope, { productId: 1, categoryIds: [12], brandId: 4 })).toBe(false)
  })
})

describe('normaliseCouponCode', () => {
  it('ignores case and spaces', () => {
    expect(normaliseCouponCode('  diwali 10 ')).toBe('DIWALI10')
  })
})
