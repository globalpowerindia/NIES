import type { ServerProps } from 'payload'

import { can, isSuperAdminUser, type Action, type ResourceKey } from '@/access/permissions'
import { NavClient, type NavGroup } from '@/admin/components/NavClient'

type Item = NavGroup['items'][number] & { show: boolean }

/**
 * Replaces Payload's navigation. Server-rendered so the badges are real counts
 * queried through the Local API rather than a client fetch on every page load.
 *
 * Each link shows only if the signed-in user's role allows it (see
 * src/access/permissions.ts), and a count is queried only for a section they
 * can see, so a badge never reveals what the role can't.
 */
export const Nav = async ({ payload, user }: ServerProps) => {
  const may = (key: ResourceKey, action: Action = 'read') => can(user, key, action)
  const count = (allowed: boolean, collection: 'orders' | 'products' | 'reviews' | 'inventory', where: object) =>
    allowed
      ? payload.count({ collection, where: where as never }).then((result) => result.totalDocs)
      : Promise.resolve(0)

  const [needsPacking, readyToShip, unpaid, draftProducts, pendingReviews, lowStock, outOfStock] = await Promise.all([
    count(may('orders'), 'orders', { status: { equals: 'CONFIRMED' } }),
    count(may('orders'), 'orders', { status: { equals: 'PACKED' } }),
    count(may('orders'), 'orders', { status: { equals: 'PENDING_PAYMENT' } }),
    count(may('products'), 'products', { status: { equals: 'DRAFT' } }),
    count(may('reviews'), 'reviews', { status: { equals: 'PENDING' } }),
    count(may('inventory'), 'inventory', { stockStatus: { equals: 'LOW_STOCK' } }),
    count(may('inventory'), 'inventory', { stockStatus: { equals: 'OUT_OF_STOCK' } }),
  ])
  const superAdmin = isSuperAdminUser(user)

  const sections: { id: string; label: string; items: Item[] }[] = [
    {
      id: 'overview',
      label: 'Overview',
      items: [{ label: 'Dashboard', href: '/admin', show: true }],
    },
    {
      id: 'commerce',
      label: 'Commerce',
      items: [
        {
          label: 'Orders',
          href: '/admin/collections/orders',
          badge: needsPacking + readyToShip,
          badgeTone: 'warning',
          show: may('orders'),
        },
        { label: 'Awaiting payment', href: '/admin/collections/orders?view=unpaid', badge: unpaid, show: may('orders') },
        { label: 'Coupons', href: '/admin/collections/coupons', show: may('coupons') },
        { label: 'Carts', href: '/admin/collections/carts', show: may('carts') },
        { label: 'Customers', href: '/admin/collections/customers', show: may('customers') },
        { label: 'Delivery & checkout', href: '/admin/globals/checkout-settings', show: may('checkout-settings', 'update') },
      ],
    },
    {
      id: 'catalogue',
      label: 'Catalogue',
      items: [
        { label: 'Products', href: '/admin/collections/products', badge: draftProducts, show: may('products') },
        { label: 'Variants', href: '/admin/collections/product-variants', show: may('product-variants') },
        { label: 'Categories', href: '/admin/collections/categories', show: may('categories') },
        { label: 'Brands', href: '/admin/collections/brands', show: may('brands') },
        { label: 'Spec definitions', href: '/admin/collections/spec-definitions', show: may('spec-definitions') },
        {
          label: 'Reviews',
          href: '/admin/collections/reviews',
          badge: pendingReviews,
          badgeTone: 'warning',
          show: may('reviews'),
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
          badge: outOfStock,
          badgeTone: 'danger',
          show: may('inventory'),
        },
        {
          label: 'Low stock',
          href: '/admin/collections/inventory?view=low',
          badge: lowStock,
          badgeTone: 'warning',
          show: may('inventory'),
        },
        { label: 'Stock movements', href: '/admin/collections/stock-movements', show: may('stock-movements') },
      ],
    },
    {
      id: 'storefront',
      label: 'Storefront',
      items: [
        { label: 'Homepage', href: '/admin/globals/home-page', show: may('home-page') },
        { label: 'Header & footer', href: '/admin/globals/site-settings', show: may('site-settings', 'update') },
        { label: 'Pages', href: '/admin/collections/pages', show: may('pages') },
        { label: 'Search synonyms', href: '/admin/collections/search-synonyms', show: may('search-synonyms') },
        { label: 'Newsletter subscribers', href: '/admin/collections/newsletter-subscribers', show: may('newsletter-subscribers') },
      ],
    },
    {
      id: 'library',
      label: 'Library',
      items: [
        { label: 'Media', href: '/admin/collections/media', show: may('media') },
        { label: 'Datasheets', href: '/admin/collections/datasheets', show: may('datasheets') },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        { label: 'Staff', href: '/admin/collections/users', show: superAdmin },
        { label: 'Roles', href: '/admin/collections/roles', show: superAdmin },
        { label: 'Audit log', href: '/admin/collections/audit-logs', show: superAdmin },
      ],
    },
  ]

  const groups: NavGroup[] = sections
    .map(({ items, ...group }) => ({ ...group, items: items.filter((item) => item.show).map(({ show: _show, ...item }) => item) }))
    .filter((group) => group.items.length > 0)

  const staffName =
    (user as { name?: string; email?: string } | null)?.name ??
    (user as { email?: string } | null)?.email ??
    'Signed in'

  return <NavClient groups={groups} staffName={staffName} />
}

export default Nav
