import { formatCurrency } from '@/lib/money'

/**
 * The cart's rules, kept free of the database so they can be tested directly:
 * how many of something a shopper may hold, whether a coupon applies and what
 * it takes off, and how a guest cart folds into an account on sign-in.
 */

/** No one line can hold more than this, whatever the stock. Matches the product page stepper. */
export const MAX_LINE_QTY = 20

export type StockLevel = { available: number; allowBackorder: boolean }

/** How many of a variant one cart line may hold right now. 0 means it can't be bought. */
export const purchasableQuantity = (stock: StockLevel | undefined): number => {
  if (!stock) return 0
  if (stock.allowBackorder) return MAX_LINE_QTY
  return Math.max(0, Math.min(MAX_LINE_QTY, Math.floor(stock.available)))
}

export type CartLineQty = { variantId: number; quantity: number }

/**
 * Folds a guest cart into the customer's. Each guest line is added to the
 * matching line, capped by what can be bought; a line the customer already
 * had is never reduced. Guest lines that can't be bought at all are dropped.
 * Returns only the lines that change, with their new quantity.
 */
export const mergeCartLines = (
  customerLines: CartLineQty[],
  guestLines: CartLineQty[],
  limitOf: (variantId: number) => number,
): CartLineQty[] => {
  const existing = new Map(customerLines.map((line) => [line.variantId, line.quantity]))
  const incoming = new Map<number, number>()
  for (const line of guestLines) {
    incoming.set(line.variantId, (incoming.get(line.variantId) ?? 0) + line.quantity)
  }

  const changes: CartLineQty[] = []
  for (const [variantId, quantity] of incoming) {
    const had = existing.get(variantId) ?? 0
    const merged = Math.max(had, Math.min(had + quantity, limitOf(variantId)))
    if (merged > had) changes.push({ variantId, quantity: merged })
  }
  return changes
}

export type CouponRule = {
  type: 'PERCENT' | 'FLAT'
  percentBps?: number | null
  amountPaise?: number | null
  maxDiscountPaise?: number | null
  minSubtotalPaise?: number | null
  startsAt?: string | null
  endsAt?: string | null
  usageLimit?: number | null
  perCustomerLimit?: number | null
  isActive?: boolean | null
}

/** Redemptions so far. `byCustomer` is null for a guest, who can't be counted. */
export type CouponUsage = { total: number; byCustomer: number | null }

export type CouponRejection =
  | 'INVALID'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_SUBTOTAL'
  | 'USED_UP'
  | 'ALREADY_USED'
  | 'SIGN_IN_REQUIRED'

export type CouponCheck =
  { ok: true; discountPaise: number } | { ok: false; reason: CouponRejection; message: string }

export const INVALID_COUPON_MESSAGE = "This code isn't valid."

const reject = (reason: CouponRejection, message: string): CouponCheck => ({
  ok: false,
  reason,
  message,
})

/**
 * Whether a coupon applies to a cart, and what it takes off. Run on every
 * cart read, so a code that expires or runs out while sitting in a cart stops
 * applying on its own instead of surprising the shopper at payment.
 *
 * Percentages round down, so the discount never exceeds the stated rate, and
 * no discount exceeds the subtotal.
 */
export const evaluateCoupon = (
  rule: CouponRule,
  cart: { subtotalPaise: number; now: Date; usage: CouponUsage },
): CouponCheck => {
  const { subtotalPaise, now, usage } = cart
  if (!rule.isActive) return reject('INVALID', INVALID_COUPON_MESSAGE)
  if (rule.startsAt && new Date(rule.startsAt) > now)
    return reject('NOT_STARTED', "This code isn't active yet.")
  if (rule.endsAt && new Date(rule.endsAt) <= now)
    return reject('EXPIRED', 'This code has expired.')

  const minimum = rule.minSubtotalPaise ?? 0
  if (subtotalPaise < minimum) {
    return reject(
      'MIN_SUBTOTAL',
      `Add ${formatCurrency(minimum - subtotalPaise)} more to use this code. It needs an order of ${formatCurrency(minimum)}.`,
    )
  }

  if (rule.usageLimit && usage.total >= rule.usageLimit) {
    return reject('USED_UP', 'This code has reached its limit.')
  }
  if (rule.perCustomerLimit) {
    if (usage.byCustomer === null)
      return reject('SIGN_IN_REQUIRED', 'Please sign in to use this code.')
    if (usage.byCustomer >= rule.perCustomerLimit) {
      return reject('ALREADY_USED', "You've already used this code.")
    }
  }

  const raw =
    rule.type === 'PERCENT'
      ? Math.floor((subtotalPaise * (rule.percentBps ?? 0)) / 10_000)
      : (rule.amountPaise ?? 0)
  const capped = rule.maxDiscountPaise ? Math.min(raw, rule.maxDiscountPaise) : raw
  return { ok: true, discountPaise: Math.max(0, Math.min(capped, subtotalPaise)) }
}

/** Codes are typed by people: case and stray spaces don't matter. */
export const normaliseCouponCode = (code: string): string =>
  code.trim().toUpperCase().replace(/\s+/g, '')
