import { randomBytes } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import type { Payload, PayloadRequest } from 'payload'

import {
  couponCoversLine,
  evaluateCoupon,
  INVALID_COUPON_MESSAGE,
  mergeCartLines,
  normaliseCouponCode,
  purchasableQuantity,
  type CouponCheck,
  type StockLevel,
} from '@/lib/cart-rules'
import { computeCartTotals, DEFAULT_GST_RATE_BPS, SELLER_STATE_CODE } from '@/lib/money'
import { relIds } from '@/lib/relations'
import { mediaOf } from '@/lib/storefront/content'
import { pickVariant, PLACEHOLDER_IMAGE, relId } from '@/lib/storefront/products'
import { inTransaction, transactionDB } from '@/lib/transaction'
import type { Coupon, Product, ProductVariant } from '@/payload-types'

/**
 * The shopper's cart. Guests are recognised by a random token in an httpOnly
 * `cart_id` cookie, signed-in customers by their account; on sign-in the guest
 * cart is folded into the account's (see `mergeGuestCart`).
 *
 * Prices and stock are never stored on the cart. Every read prices it afresh
 * and checks each line against today's stock and today's coupon rules, so the
 * cart can't drift from what checkout will charge.
 */

export const CART_COOKIE = 'cart_id'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export type CartRef = { id: number; customerId: number | null; couponId: number | null }

const toRef = (doc: { id: number; customer?: unknown; coupon?: unknown }): CartRef => ({
  id: doc.id,
  customerId: relId(doc.customer) ?? null,
  couponId: relId(doc.coupon) ?? null,
})

const findActiveCart = async (
  payload: Payload,
  owner: { customerId: number } | { token: string },
  req?: PayloadRequest,
): Promise<CartRef | null> => {
  const { docs } = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { status: { equals: 'ACTIVE' } },
        'customerId' in owner
          ? { customer: { equals: owner.customerId } }
          : { and: [{ token: { equals: owner.token } }, { customer: { exists: false } }] },
      ],
    },
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return docs[0] ? toRef(docs[0]) : null
}

/** The shopper's cart if they have one. Safe in server components: never writes a cookie. */
export const findCart = async (
  payload: Payload,
  customerId: number | null,
): Promise<CartRef | null> => {
  if (customerId) return findActiveCart(payload, { customerId })
  const token = (await cookies()).get(CART_COOKIE)?.value
  return token ? findActiveCart(payload, { token }) : null
}

/** The shopper's cart, created on first use. Route handlers only, since it may set the cookie. */
export const findOrCreateCart = async (
  payload: Payload,
  customerId: number | null,
): Promise<CartRef> => {
  const existing = await findCart(payload, customerId)
  if (existing) return existing

  const create = (data: { customer: number | null; token: string | null }, req?: PayloadRequest) =>
    payload.create({
      collection: 'carts',
      data: { ...data, status: 'ACTIVE', lastActivityAt: new Date().toISOString() },
      overrideAccess: true,
      req,
    })

  // Two first adds at once must not give an account two carts: look again
  // under the customer's lock (the database index backs this up).
  if (customerId) {
    return inTransaction(payload, [cartLock(customerId)], async (req) =>
      (await findActiveCart(payload, { customerId }, req)) ?? toRef(await create({ customer: customerId, token: null }, req)),
    )
  }

  const token = randomBytes(24).toString('base64url')
  const created = await create({ customer: null, token })
  ;(await cookies()).set(CART_COOKIE, token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE_SECONDS })
  return toRef(created)
}

const cartLock = (customerId: number) => `cart:customer:${customerId}`

/** Any change brings a cart back from "abandoned". */
const touch = async (payload: Payload, cartId: number, data: Record<string, unknown> = {}, req?: PayloadRequest) => {
  await payload.update({
    collection: 'carts',
    id: cartId,
    data: { ...data, lastActivityAt: new Date().toISOString(), abandonedAt: null },
    overrideAccess: true,
    req,
  })
}

type StockRow = {
  variant?: unknown
  onHand?: number | null
  reserved?: number | null
  allowBackorder?: boolean | null
}

const loadStock = async (
  payload: Payload,
  variantIds: number[],
): Promise<Map<number, StockLevel>> => {
  const stock = new Map<number, StockLevel>()
  if (variantIds.length === 0) return stock
  const { docs } = await payload.find({
    collection: 'inventory',
    where: { variant: { in: variantIds } },
    pagination: false,
    depth: 0,
    select: { variant: true, onHand: true, reserved: true, allowBackorder: true },
    overrideAccess: true,
  })
  for (const row of docs as StockRow[]) {
    const variantId = relId(row.variant)
    if (variantId === undefined) continue
    stock.set(variantId, {
      available: Number(row.onHand ?? 0) - Number(row.reserved ?? 0),
      allowBackorder: Boolean(row.allowBackorder),
    })
  }
  return stock
}

/**
 * Variants that can be sold at all: active, on an active product that is sold
 * online (the rest are enquiry-only). Keyed by id, with their product.
 */
const loadSellableVariants = async (
  payload: Payload,
  variantIds: number[],
): Promise<Map<number, { variant: ProductVariant; product: Product }>> => {
  const out = new Map<number, { variant: ProductVariant; product: Product }>()
  if (variantIds.length === 0) return out
  const variants = await payload.find({
    collection: 'product-variants',
    where: { and: [{ id: { in: variantIds } }, { isActive: { equals: true } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const productIds = [
    ...new Set(variants.docs.map((variant) => relId(variant.product)).filter(Boolean)),
  ] as number[]
  const products = await payload.find({
    collection: 'products',
    where: {
      and: [{ id: { in: productIds } }, { status: { equals: 'ACTIVE' } }, { sellOnline: { equals: true } }],
    },
    pagination: false,
    depth: 1,
    overrideAccess: true,
  })
  const productById = new Map(products.docs.map((product) => [product.id, product]))
  for (const variant of variants.docs) {
    const product = productById.get(relId(variant.product) ?? -1)
    if (product) out.set(variant.id, { variant, product })
  }
  return out
}

type ItemRow = { id: number; variantId: number; productId: number; quantity: number }

const loadItems = async (payload: Payload, cartId: number, req?: PayloadRequest): Promise<ItemRow[]> => {
  const { docs } = await payload.find({
    collection: 'cart-items',
    where: { cart: { equals: cartId } },
    sort: 'createdAt',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return docs.map((doc) => ({
    id: doc.id,
    variantId: relId(doc.variant)!,
    productId: relId(doc.product)!,
    quantity: Number(doc.quantity),
  }))
}

export type CartLineStatus = 'OK' | 'LIMITED' | 'OUT_OF_STOCK' | 'UNAVAILABLE'

export type CartLineView = {
  variantId: number
  productId: number
  href: string | null
  name: string
  subtitle: string | null
  /** Shown only when the product comes in more than one variant. */
  variantName: string | null
  sku: string | null
  imageUrl: string
  imageAlt: string
  unitPricePaise: number
  mrpPaise: number
  quantity: number
  /** Most this line can hold right now. 0 when it can't be bought. */
  maxQuantity: number
  status: CartLineStatus
  /** Whether the applied coupon's discount covers this line (always true for a whole-order code). */
  couponEligible: boolean
}

export type CartCouponView = {
  code: string
  applied: boolean
  message: string | null
  /** A free-delivery code: nothing comes off the items; checkout waives delivery. */
  freeShipping: boolean
}

export type CartView = {
  lines: CartLineView[]
  /** Units across every line, for the header badge. */
  itemCount: number
  /** What the buyable lines cost at today's prices, GST included. */
  subtotalPaise: number
  /** The same lines at MRP, for "you save". */
  mrpTotalPaise: number
  discountPaise: number
  /** Before delivery, which depends on the address and is added at checkout. */
  totalPaise: number
  /** GST already inside `totalPaise`. */
  gstPaise: number
  /**
   * The subtotal taken apart, before any coupon: taxable value plus GST adds
   * back up to `subtotalPaise` exactly. Split as CGST + SGST until checkout
   * knows the delivery state. `rateBps` is set when every line has the same rate.
   */
  breakdown: { taxablePaise: number; cgstPaise: number; sgstPaise: number; rateBps: number | null }
  coupon: CartCouponView | null
  /** False while any line is out of stock, over the limit, or no longer sold. */
  canCheckout: boolean
}

export const EMPTY_CART: CartView = {
  lines: [],
  itemCount: 0,
  subtotalPaise: 0,
  mrpTotalPaise: 0,
  discountPaise: 0,
  totalPaise: 0,
  gstPaise: 0,
  breakdown: { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, rateBps: null },
  coupon: null,
  canCheckout: false,
}

/**
 * Uses of a coupon: paid redemptions, plus checkouts still open with it (they
 * hold their use until paid or expired, so the last use can't go to two
 * people). This cart's own open checkout is left out, so a retry doesn't
 * count against itself.
 */
export const couponUsage = async (
  payload: Payload,
  couponId: number,
  customerId: number | null,
  cartId: number | null,
  req?: PayloadRequest,
) => {
  const holding = {
    and: [
      { coupon: { equals: couponId } },
      { status: { equals: 'PENDING_PAYMENT' } },
      { paymentExpiresAt: { greater_than: new Date().toISOString() } },
      ...(cartId ? [{ cart: { not_equals: cartId } }] : []),
    ],
  }
  const count = (collection: 'coupon-redemptions' | 'orders', where: object) =>
    payload.count({ collection, where: where as never, overrideAccess: true, req }).then((result) => result.totalDocs)
  const mine = (where: { and: object[] }) => ({ and: [...where.and, { customer: { equals: customerId } }] })
  const redeemed = { and: [{ coupon: { equals: couponId } }] }

  const [total, held, byCustomer, heldByCustomer] = await Promise.all([
    count('coupon-redemptions', redeemed),
    count('orders', holding),
    customerId ? count('coupon-redemptions', mine(redeemed)) : null,
    customerId ? count('orders', mine(holding)) : null,
  ])
  return { total: total + held, byCustomer: byCustomer === null ? null : byCustomer + (heldByCustomer ?? 0) }
}

/** Whether the customer has never had a paid order; null for a guest. */
const isFirstOrder = async (payload: Payload, customerId: number | null, req?: PayloadRequest) =>
  customerId
    ? (await payload.count({
        collection: 'orders',
        where: { and: [{ customer: { equals: customerId } }, { paidAt: { exists: true } }] },
        overrideAccess: true,
        req,
      })).totalDocs === 0
    : null

/** Each category with every parent above it, for "this category and its sub-categories". */
const categoryAncestry = async (payload: Payload): Promise<Map<number, number[]>> => {
  const { docs } = await payload.find({
    collection: 'categories',
    pagination: false,
    depth: 0,
    select: { parent: true },
    overrideAccess: true,
  })
  const parentOf = new Map(docs.map((doc) => [doc.id, relId(doc.parent) ?? null]))
  const chain = (id: number) => {
    const ids: number[] = []
    for (let at: number | null = id; at !== null && !ids.includes(at); at = parentOf.get(at) ?? null) ids.push(at)
    return ids
  }
  return new Map([...parentOf.keys()].map((id) => [id, chain(id)]))
}

export type CouponLine = { productId: number; grossPaise: number; categoryId: number | null; brandId: number | null }

/**
 * Every coupon rule for this cart, in one place: the cart view, the coupon box
 * and checkout all ask here, so they can never disagree. Returns the result and
 * which products the discount covers.
 */
export const checkCartCoupon = async (
  payload: Payload,
  rule: Coupon,
  cart: { cartId: number | null; customerId: number | null; lines: CouponLine[] },
  req?: PayloadRequest,
): Promise<{ check: CouponCheck; covered: Set<number> }> => {
  const subtotalPaise = cart.lines.reduce((sum, line) => sum + line.grossPaise, 0)
  let covered = new Set(cart.lines.map((line) => line.productId))
  if (rule.appliesTo === 'ITEMS' && rule.type !== 'FREE_SHIPPING') {
    const scope = { productIds: relIds(rule.products), categoryIds: relIds(rule.categories), brandIds: relIds(rule.brands) }
    const ancestry = scope.categoryIds.length ? await categoryAncestry(payload) : new Map<number, number[]>()
    covered = new Set(
      cart.lines
        .filter((line) =>
          couponCoversLine(scope, {
            productId: line.productId,
            brandId: line.brandId,
            categoryIds: line.categoryId === null ? [] : (ancestry.get(line.categoryId) ?? [line.categoryId]),
          }),
        )
        .map((line) => line.productId),
    )
  }
  const [usage, firstOrder] = await Promise.all([
    couponUsage(payload, rule.id, cart.customerId, cart.cartId, req),
    rule.firstOrderOnly ? isFirstOrder(payload, cart.customerId, req) : Promise.resolve(null),
  ])
  const check = evaluateCoupon(rule, {
    subtotalPaise,
    eligibleSubtotalPaise: cart.lines.filter((line) => covered.has(line.productId)).reduce((sum, line) => sum + line.grossPaise, 0),
    now: new Date(),
    usage,
    firstOrder,
  })
  return { check, covered }
}

const couponLinesOf = (
  lines: Pick<CartLineView, 'productId' | 'unitPricePaise' | 'quantity'>[],
  products: Map<number, Product>,
): CouponLine[] =>
  lines.map((line) => {
    const product = products.get(line.productId)
    return {
      productId: line.productId,
      grossPaise: line.unitPricePaise * line.quantity,
      categoryId: relId(product?.category) ?? null,
      brandId: relId(product?.brand) ?? null,
    }
  })

/** Prices the cart at today's prices and stock, and re-checks its coupon. */
export const loadCartView = async (payload: Payload, cart: CartRef | null): Promise<CartView> => {
  if (!cart) return EMPTY_CART
  const items = await loadItems(payload, cart.id)
  if (items.length === 0 && !cart.couponId) return EMPTY_CART

  const variantIds = items.map((item) => item.variantId)
  const [sellable, stock] = await Promise.all([
    loadSellableVariants(payload, variantIds),
    loadStock(payload, variantIds),
  ])

  // How many active variants each product has, to decide whether a line needs its variant named.
  const productIds = [...new Set([...sellable.values()].map(({ product }) => product.id))]
  const siblings = productIds.length
    ? await payload.find({
        collection: 'product-variants',
        where: { and: [{ product: { in: productIds } }, { isActive: { equals: true } }] },
        pagination: false,
        depth: 0,
        select: { product: true },
        overrideAccess: true,
      })
    : { docs: [] }
  const variantCount = new Map<number, number>()
  for (const doc of siblings.docs) {
    const productId = relId(doc.product)
    if (productId !== undefined) variantCount.set(productId, (variantCount.get(productId) ?? 0) + 1)
  }

  const lines = items.map<CartLineView>((item) => {
    const found = sellable.get(item.variantId)
    if (!found) {
      return {
        variantId: item.variantId,
        productId: item.productId,
        href: null,
        name: 'No longer available',
        subtitle: null,
        variantName: null,
        sku: null,
        imageUrl: PLACEHOLDER_IMAGE,
        imageAlt: '',
        unitPricePaise: 0,
        mrpPaise: 0,
        quantity: item.quantity,
        maxQuantity: 0,
        status: 'UNAVAILABLE',
        couponEligible: false,
      }
    }
    const { variant, product } = found
    const image = mediaOf(product.images?.[0])
    const maxQuantity = purchasableQuantity(stock.get(variant.id))
    return {
      variantId: variant.id,
      productId: product.id,
      href: `/products/${product.slug}`,
      name: product.name,
      subtitle: product.subtitle ?? null,
      variantName: (variantCount.get(product.id) ?? 1) > 1 ? variant.name : null,
      sku: variant.sku,
      imageUrl: image?.url ?? PLACEHOLDER_IMAGE,
      imageAlt: image?.alt || product.name,
      unitPricePaise: variant.sellingPricePaise,
      mrpPaise: Math.max(variant.mrpPaise, variant.sellingPricePaise),
      quantity: item.quantity,
      maxQuantity,
      status: maxQuantity === 0 ? 'OUT_OF_STOCK' : item.quantity > maxQuantity ? 'LIMITED' : 'OK',
      couponEligible: true,
    }
  })

  const buyable = lines.filter((line) => line.status === 'OK' || line.status === 'LIMITED')
  const gstOf = new Map(
    [...sellable.values()].map(({ product }) => [product.id, product.gstRateBps]),
  )
  const subtotalPaise = buyable.reduce((sum, line) => sum + line.unitPricePaise * line.quantity, 0)

  let coupon: CartCouponView | null = null
  let discountPaise = 0
  if (cart.couponId) {
    const rule = await payload.findByID({
      collection: 'coupons',
      id: cart.couponId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    if (rule) {
      const productById = new Map([...sellable.values()].map(({ product }) => [product.id, product]))
      const { check, covered } = await checkCartCoupon(payload, rule, {
        cartId: cart.id,
        customerId: cart.customerId,
        lines: couponLinesOf(buyable, productById),
      })
      coupon = {
        code: rule.code,
        applied: check.ok,
        message: check.ok ? null : check.message,
        freeShipping: check.ok && check.freeShipping,
      }
      discountPaise = check.ok ? check.discountPaise : 0
      for (const line of lines) line.couponEligible = check.ok && covered.has(line.productId)
    }
  }

  const taxLines = buyable.map((line) => ({
    sellingPricePaise: line.unitPricePaise,
    quantity: line.quantity,
    gstRateBps: gstOf.get(line.productId) ?? DEFAULT_GST_RATE_BPS,
    discountable: line.couponEligible,
  }))
  // Delivery and the state's GST split are settled at checkout; the total is the same either way.
  const totals = computeCartTotals({ lines: taxLines, shipStateCode: SELLER_STATE_CODE, discountPaise })
  const beforeCoupon = computeCartTotals({ lines: taxLines, shipStateCode: SELLER_STATE_CODE })
  const rates = new Set(taxLines.map((line) => line.gstRateBps))

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalPaise,
    mrpTotalPaise: buyable.reduce((sum, line) => sum + line.mrpPaise * line.quantity, 0),
    discountPaise: totals.discountPaise,
    totalPaise: totals.grandTotalPaise,
    gstPaise: totals.cgstPaise + totals.sgstPaise + totals.igstPaise,
    breakdown: {
      taxablePaise: beforeCoupon.taxablePaise,
      cgstPaise: beforeCoupon.cgstPaise,
      sgstPaise: beforeCoupon.sgstPaise,
      rateBps: rates.size === 1 ? [...rates][0] : null,
    },
    coupon,
    canCheckout: lines.length > 0 && lines.every((line) => line.status === 'OK'),
  }
}

export type CartChange =
  { ok: true; notice?: string } | { ok: false; status: number; error: string }

const OUT_OF_STOCK = 'Sorry, this is out of stock.'
const ENQUIRY_ONLY = 'This product isn’t sold online. Message us on WhatsApp for the price and availability.'

/** An active product that staff haven't put on sale online: say so, rather than "no longer available". */
const isEnquiryOnly = async (payload: Payload, variantId: number): Promise<boolean> => {
  const variant = await payload.findByID({
    collection: 'product-variants',
    id: variantId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  })
  const product = variant && typeof variant.product === 'object' ? variant.product : null
  return Boolean(variant?.isActive && product?.status === 'ACTIVE' && !product.sellOnline)
}

/**
 * The variant to add when a shopper picks a product rather than a variant
 * (product cards, compare, wishlist): the one its card is priced from.
 */
export const resolveVariant = async (
  payload: Payload,
  input: { productId?: number; variantId?: number },
): Promise<number | null> => {
  if (input.variantId) return input.variantId
  if (!input.productId) return null
  const { docs } = await payload.find({
    collection: 'product-variants',
    where: { and: [{ product: { equals: input.productId } }, { isActive: { equals: true } }] },
    sort: 'sortOrder',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return pickVariant(docs)?.id ?? null
}

/** Adds to a line, capped at what can be bought. Adding more than that is a notice, not an error. */
export const addToCart = async (
  payload: Payload,
  /** Called only once the add is accepted, so a refused add never creates a cart. */
  getCart: () => Promise<CartRef>,
  variantId: number,
  quantity: number,
): Promise<CartChange> => {
  const found = (await loadSellableVariants(payload, [variantId])).get(variantId)
  if (!found) {
    return (await isEnquiryOnly(payload, variantId))
      ? { ok: false, status: 409, error: ENQUIRY_ONLY }
      : { ok: false, status: 404, error: 'This product is no longer available.' }
  }
  const limit = purchasableQuantity((await loadStock(payload, [variantId])).get(variantId))
  if (limit === 0) return { ok: false, status: 409, error: OUT_OF_STOCK }

  const cart = await getCart()

  // One statement, so two quick clicks add two, not one: insert the line, or
  // add to it if it exists, capped at the limit either way.
  const result = await payload.db.drizzle.execute(sql`
    WITH previous AS (
      SELECT quantity FROM cart_items WHERE cart_id = ${cart.id} AND variant_id = ${variantId}
    )
    INSERT INTO cart_items (cart_id, variant_id, product_id, quantity, updated_at, created_at)
    VALUES (${cart.id}, ${variantId}, ${found.product.id}, LEAST(${quantity}::numeric, ${limit}::numeric), now(), now())
    ON CONFLICT (cart_id, variant_id) DO UPDATE
      SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, ${limit}::numeric), updated_at = now()
    RETURNING quantity, (SELECT quantity FROM previous) AS had
  `)
  const next = Number(result.rows[0].quantity)
  const had = Number(result.rows[0].had ?? 0)
  await touch(payload, cart.id)

  if (next === had) {
    return {
      ok: true,
      notice: `You already have ${had} in your cart, the most we can sell you right now.`,
    }
  }
  return next < had + quantity
    ? { ok: true, notice: `Only ${limit} available, so your cart now has ${next}.` }
    : { ok: true }
}

/** Writes one line, recovering if a simultaneous request created it first. */
const setLine = async (
  payload: Payload,
  cartId: number,
  line: { variantId: number; productId: number; quantity: number },
  existingId?: number,
) => {
  const update = (id: number) =>
    payload.update({
      collection: 'cart-items',
      id,
      data: { quantity: line.quantity },
      overrideAccess: true,
    })
  if (existingId) return update(existingId)
  try {
    await payload.create({
      collection: 'cart-items',
      data: {
        cart: cartId,
        variant: line.variantId,
        product: line.productId,
        quantity: line.quantity,
      },
      overrideAccess: true,
    })
  } catch (error) {
    // The unique (cart, variant) index turned away a duplicate from a double click.
    const raced = (await loadItems(payload, cartId)).find(
      (item) => item.variantId === line.variantId,
    )
    if (!raced) throw error
    await update(raced.id)
  }
}

/** Sets a line's quantity; 0 removes it. More than can be bought is capped, with a notice. */
export const setCartQuantity = async (
  payload: Payload,
  cart: CartRef,
  variantId: number,
  quantity: number,
): Promise<CartChange> => {
  const existing = (await loadItems(payload, cart.id)).find((item) => item.variantId === variantId)
  if (!existing) return { ok: false, status: 404, error: 'That item is no longer in your cart.' }
  if (quantity === 0) return removeFromCart(payload, cart, variantId)

  const found = (await loadSellableVariants(payload, [variantId])).get(variantId)
  const limit = found
    ? purchasableQuantity((await loadStock(payload, [variantId])).get(variantId))
    : 0
  // Lowering a quantity is always allowed, so a shopper can fix an over-limit line.
  const next =
    quantity <= existing.quantity
      ? quantity
      : Math.min(quantity, Math.max(limit, existing.quantity))
  if (next !== existing.quantity) {
    await setLine(payload, cart.id, { ...existing, quantity: next }, existing.id)
    await touch(payload, cart.id)
  }
  if (next < quantity) {
    return { ok: true, notice: limit === 0 ? OUT_OF_STOCK : `Only ${limit} available.` }
  }
  return { ok: true }
}

export const removeFromCart = async (
  payload: Payload,
  cart: CartRef,
  variantId: number,
): Promise<CartChange> => {
  await payload.delete({
    collection: 'cart-items',
    where: { and: [{ cart: { equals: cart.id } }, { variant: { equals: variantId } }] },
    overrideAccess: true,
  })
  await touch(payload, cart.id)
  return { ok: true }
}

/**
 * Applies a code if it works for this cart right now. A code that doesn't is
 * refused with the reason, and the cart keeps whatever code it had.
 */
export const applyCoupon = async (
  payload: Payload,
  cart: CartRef,
  rawCode: string,
): Promise<CartChange> => {
  const code = normaliseCouponCode(rawCode)
  const { docs } = await payload.find({
    collection: 'coupons',
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const rule = docs[0]
  if (!rule) return { ok: false, status: 422, error: INVALID_COUPON_MESSAGE }

  const view = await loadCartView(payload, { ...cart, couponId: null })
  const buyable = view.lines.filter((line) => line.status === 'OK' || line.status === 'LIMITED')
  const products = buyable.length
    ? await payload.find({
        collection: 'products',
        where: { id: { in: buyable.map((line) => line.productId) } },
        pagination: false,
        depth: 0,
        select: { category: true, brand: true },
        overrideAccess: true,
      })
    : { docs: [] }
  const { check } = await checkCartCoupon(payload, rule, {
    cartId: cart.id,
    customerId: cart.customerId,
    lines: couponLinesOf(buyable, new Map(products.docs.map((product) => [product.id, product as Product]))),
  })
  if (!check.ok) return { ok: false, status: 422, error: check.message }

  await touch(payload, cart.id, { coupon: rule.id })
  return { ok: true }
}

export const removeCoupon = async (payload: Payload, cart: CartRef): Promise<CartChange> => {
  await touch(payload, cart.id, { coupon: null })
  return { ok: true }
}

/**
 * Folds the guest cart from this browser into the customer's, on sign-in.
 * With no account cart yet, the guest cart simply becomes theirs. Otherwise
 * each guest line is added to the account's, capped by stock, and the guest
 * cart is marked merged. The guest's coupon carries over only if the account
 * cart has none; it is checked again on the next view like any other.
 */
export const mergeGuestCart = async (payload: Payload, customerId: number): Promise<void> => {
  const store = await cookies()
  const token = store.get(CART_COOKIE)?.value
  if (!token) return

  // All or nothing, under the account's and the guest cart's locks, so a
  // simultaneous add or second sign-in can't interleave with it.
  await inTransaction(payload, [cartLock(customerId), `cart:token:${token}`], async (req) => {
    const guest = await findActiveCart(payload, { token }, req)
    if (!guest) return

    const account = await findActiveCart(payload, { customerId }, req)
    if (!account) {
      await touch(payload, guest.id, { customer: customerId, token: null }, req)
      return
    }

    const [guestItems, accountItems] = await Promise.all([
      loadItems(payload, guest.id, req),
      loadItems(payload, account.id, req),
    ])
    const variantIds = [...new Set(guestItems.map((item) => item.variantId))]
    const [sellable, stock] = await Promise.all([
      loadSellableVariants(payload, variantIds),
      loadStock(payload, variantIds),
    ])
    const changes = mergeCartLines(accountItems, guestItems, (variantId) =>
      sellable.has(variantId) ? purchasableQuantity(stock.get(variantId)) : 0,
    )

    // An upsert rather than create-then-recover: inside a transaction a
    // unique-index error would abort everything after it.
    const db = await transactionDB(req)
    for (const change of changes) {
      await db.execute(sql`
        INSERT INTO cart_items (cart_id, variant_id, product_id, quantity, updated_at, created_at)
        VALUES (${account.id}, ${change.variantId}, ${sellable.get(change.variantId)!.product.id}, ${change.quantity}, now(), now())
        ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()
      `)
    }

    await touch(
      payload,
      account.id,
      !account.couponId && guest.couponId ? { coupon: guest.couponId } : {},
      req,
    )
    await payload.update({
      collection: 'carts',
      id: guest.id,
      data: { status: 'MERGED', token: null },
      overrideAccess: true,
      req,
    })
  })

  // Only once the merge has committed: a failed merge keeps the cookie, so
  // the guest cart is still there to merge on the next sign-in.
  store.set(CART_COOKIE, '', { ...cookieOptions, maxAge: 0 })
}
