import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccountCard, AccountEmpty, AccountShell } from '@/components/account/AccountShell'
import { WishlistRow } from '@/components/account/WishlistRow'
import { ButtonLink } from '@/components/ui/button'
import { getWishlist } from '@/lib/storefront/account'
import { getCurrentCustomer } from '@/lib/storefront/customer'
import { getPayloadClient } from '@/lib/storefront/queries'

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: false } }

/** Saved products (Figma 1100:28047; phones 1412:32192), or the empty state (1080:27250). */
export default async function WishlistPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/login?next=/account/wishlist')

  const items = await getWishlist(await getPayloadClient(), customer.id)

  return (
    <AccountShell customer={customer} title="Wishlist" phoneScreen>
      <AccountCard title="Wishlist" grow plainOnPhone>
        {items.length === 0 ? (
          <AccountEmpty
            image="/illustrations/empty-wishlist.svg"
            title="No Wishlist"
            text="Add products in your wishlist"
            action={
              <ButtonLink href="/products" variant="blue" className="h-12.5 w-58">
                Continue Shopping
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-2 sm:gap-4">
            {items.map((item) => (
              <WishlistRow key={item.productId} item={item} />
            ))}
          </div>
        )}
      </AccountCard>
    </AccountShell>
  )
}
