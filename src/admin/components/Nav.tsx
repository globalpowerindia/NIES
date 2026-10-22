import type { ServerProps } from 'payload'

import { NavClient, type NavGroup } from '@/admin/components/NavClient'

/**
 * Replaces Payload's navigation. Server-rendered so the badges are real counts
 * queried through the Local API rather than a client fetch on every page load.
 */
export const Nav = async ({ payload, user }: ServerProps) => {
  const [needsPacking, readyToShip, unpaid, draftProducts, pendingReviews, lowStock, outOfStock] =
    await Promise.all([
      payload.count({ collection: 'orders', where: { status: { equals: 'CONFIRMED' } } }),
      payload.count({ collection: 'orders', where: { status: { equals: 'PACKED' } } }),
      payload.count({ collection: 'orders', where: { status: { equals: 'PENDING_PAYMENT' } } }),
      payload.count({ collection: 'products', where: { status: { equals: 'DRAFT' } } }),
      payload.count({ collection: 'reviews', where: { status: { equals: 'PENDING' } } }),
      payload.count({ collection: 'inventory', where: { stockStatus: { equals: 'LOW_STOCK' } } }),
      payload.count({ collection: 'inventory', where: { stockStatus: { equals: 'OUT_OF_STOCK' } } }),
    ])

  const groups: NavGroup[] = [
    {
      id: 'commerce',
      label: 'Commerce',
      items: [
        {
          label: 'Orders',
          href: '/admin/collections/orders',
          badge: needsPacking.totalDocs + readyToShip.totalDocs,
          badgeTone: 'warning',
        },
        { label: 'Awaiting payment', href: '/admin/collections/orders?view=unpaid', badge: unpaid.totalDocs },
        { label: 'Coupons', href: '/admin/collections/coupons' },
        { label: 'Carts', href: '/admin/collections/carts' },
        { label: 'Customers', href: '/admin/collections/customers' },
        { label: 'Delivery & checkout', href: '/admin/globals/checkout-settings' },
      ],
    },
    {
      id: 'catalogue',
      label: 'Catalogue',
      items: [
        { label: 'Products', href: '/admin/collections/products', badge: draftProducts.totalDocs },
        { label: 'Variants', href: '/admin/collections/product-variants' },
        { label: 'Categories', href: '/admin/collections/categories' },
        { label: 'Brands', href: '/admin/collections/brands' },
        { label: 'Spec definitions', href: '/admin/collections/spec-definitions' },
        {
          label: 'Reviews',
          href: '/admin/collections/reviews',
          badge: pendingReviews.totalDocs,
          badgeTone: 'warning',
        },
      ],
    },
    {
      id: 'inventory',
      label: 'Inventory',
      items: [
        {
          label: 'Stock levels',
          href: '/admin/collections/inventory',
          badge: outOfStock.totalDocs,
          badgeTone: 'danger',
        },
        {
          label: 'Low stock',
          href: '/admin/collections/inventory?view=low',
          badge: lowStock.totalDocs,
          badgeTone: 'warning',
        },
        { label: 'Stock movements', href: '/admin/collections/stock-movements' },
      ],
    },
    {
      id: 'storefront',
      label: 'Storefront',
      items: [
        { label: 'Homepage', href: '/admin/globals/home-page' },
        { label: 'Header & footer', href: '/admin/globals/site-settings' },
        { label: 'Pages', href: '/admin/collections/pages' },
        { label: 'Search synonyms', href: '/admin/collections/search-synonyms' },
        { label: 'Newsletter subscribers', href: '/admin/collections/newsletter-subscribers' },
      ],
    },
    {
      id: 'library',
      label: 'Library',
      items: [
        { label: 'Media', href: '/admin/collections/media' },
        { label: 'Datasheets', href: '/admin/collections/datasheets' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [{ label: 'Staff', href: '/admin/collections/users' }],
    },
  ]

  const staffName =
    (user as { name?: string; email?: string } | null)?.name ??
    (user as { email?: string } | null)?.email ??
    'Signed in'

  return <NavClient groups={groups} staffName={staffName} />
}

export default Nav
