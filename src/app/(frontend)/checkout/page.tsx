import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { CheckoutForm, type CheckoutAddress, type CheckoutQuoteView } from '@/components/checkout/CheckoutForm'
import { ButtonLink } from '@/components/ui/button'
import { checkoutProblem, loadShippingRates, quoteCheckout } from '@/lib/checkout'
import { razorpayKeys } from '@/lib/razorpay'
import { addressLines } from '@/lib/storefront/account'
import { findCart, loadCartView } from '@/lib/storefront/cart'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'
import { displayPhone } from '@/lib/phone'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }

/**
 * Delivery address, order summary and payment. Every address is quoted on
 * the server, so switching between them never needs a round trip and the
 * totals shown are the ones `placeOrder` will compute.
 */
export default async function Checkout() {
  const [payload, customer] = await Promise.all([getPayloadClient(), getCurrentCustomer()])
  if (!customer) redirect('/login?next=/checkout')

  const cart = await loadCartView(payload, await findCart(payload, customer.id))
  if (cart.lines.length === 0) redirect('/cart')

  const problem = checkoutProblem(cart)
  if (problem) {
    return (
      <main className="bg-light-400 pb-6">
        <section className="container-page flex flex-col items-center gap-4 pt-16 pb-10 text-center">
          <h1 className="text-h4 font-semibold text-dark-500">Almost there</h1>
          <p role="alert" className="max-w-[35rem] text-label1 text-dark-300">
            {problem}
          </p>
          <ButtonLink href="/cart" variant="blue" className="h-12.5 w-58">
            Back to Cart
          </ButtonLink>
        </section>
      </main>
    )
  }

  const [addressDocs, rates] = await Promise.all([
    payload.find({
      collection: 'addresses',
      where: { customer: { equals: customer.id } },
      sort: '-updatedAt',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    loadShippingRates(payload),
  ])

  const quotes: Record<number, CheckoutQuoteView> = {}
  const byState = new Map<string, CheckoutQuoteView>()
  for (const address of addressDocs.docs) {
    let view = byState.get(address.stateCode)
    if (!view) {
      const { totals, weightGrams, deliveryDiscountPaise } = await quoteCheckout(payload, cart, address.stateCode, rates)
      view = {
        weightGrams,
        deliveryDiscountPaise,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        taxablePaise: totals.taxablePaise,
        cgstPaise: totals.cgstPaise,
        sgstPaise: totals.sgstPaise,
        igstPaise: totals.igstPaise,
        grandTotalPaise: totals.grandTotalPaise,
      }
      byState.set(address.stateCode, view)
    }
    quotes[address.id] = view
  }

  const addresses: CheckoutAddress[] = addressDocs.docs.map((address) => ({
    id: address.id,
    fullName: address.fullName,
    phone: displayPhone(address.phone),
    type: address.type,
    lines: addressLines(address),
  }))

  return (
    <main className="bg-light-400 pb-6">
      <div className="container-page pt-6">
        <CheckoutForm
          lines={cart.lines.map((line) => ({
            variantId: line.variantId,
            name: line.name,
            variantName: line.variantName,
            imageUrl: line.imageUrl,
            imageAlt: line.imageAlt,
            quantity: line.quantity,
            unitPricePaise: line.unitPricePaise,
          }))}
          couponCode={cart.coupon?.applied ? cart.coupon.code : null}
          addresses={addresses}
          quotes={quotes}
          email={customer.email ?? ''}
          paymentReady={Boolean(razorpayKeys())}
        />
      </div>
    </main>
  )
}
