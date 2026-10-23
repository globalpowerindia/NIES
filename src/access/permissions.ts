/**
 * Staff permissions: what each role may do in each section of the admin.
 *
 * Super admins can do everything and are the only ones who manage staff,
 * roles and the audit log. Every other staff user has one role, which the
 * super admin edits under Settings → Roles as a grid of sections × actions.
 *
 * `RESOURCES` is also the ceiling: an action a section doesn't list can't be
 * granted to a role, whatever the role says. Deleting orders (tax records)
 * stays with super admins; system-only writes (paying an order, editing the
 * stock ledger, writing carts) stay closed to everyone.
 *
 * Dependency-free, so access rules, the admin navigation and client
 * components all read the same rules.
 */

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const
export type Action = (typeof ACTIONS)[number]

export const ACTION_LABELS: Record<Action, string> = { read: 'View', create: 'Create', update: 'Edit', delete: 'Delete' }

export type Resource = {
  key: string
  label: string
  group: string
  /** The most that can ever be granted here. */
  actions: readonly Action[]
  /** Shown under the section name, for actions left out on purpose. */
  note?: string
}

const ALL = ACTIONS

export const RESOURCES = [
  { key: 'orders', label: 'Orders', group: 'Commerce', actions: ['read', 'create', 'update'], note: 'Delete: super admins only, as orders are tax records.' },
  { key: 'coupons', label: 'Coupons', group: 'Commerce', actions: ALL },
  { key: 'carts', label: 'Carts', group: 'Commerce', actions: ['read', 'delete'], note: 'Written only by shoppers.' },
  { key: 'customers', label: 'Customers', group: 'Commerce', actions: ALL },
  { key: 'addresses', label: 'Customer addresses', group: 'Commerce', actions: ALL },
  { key: 'auth-identities', label: 'Customer login methods', group: 'Commerce', actions: ['read'], note: 'Delete: super admins only.' },
  { key: 'wishlist-items', label: 'Wishlists', group: 'Commerce', actions: ['read', 'delete'] },
  { key: 'checkout-settings', label: 'Delivery & checkout settings', group: 'Commerce', actions: ['update'], note: 'Read by the storefront.' },
  { key: 'products', label: 'Products', group: 'Catalogue', actions: ALL },
  { key: 'product-variants', label: 'Variants', group: 'Catalogue', actions: ALL },
  { key: 'categories', label: 'Categories', group: 'Catalogue', actions: ALL },
  { key: 'brands', label: 'Brands', group: 'Catalogue', actions: ALL },
  { key: 'spec-definitions', label: 'Spec definitions', group: 'Catalogue', actions: ALL },
  { key: 'reviews', label: 'Reviews', group: 'Catalogue', actions: ALL },
  { key: 'inventory', label: 'Stock levels', group: 'Inventory', actions: ['read', 'create', 'update'] },
  { key: 'stock-movements', label: 'Stock movements', group: 'Inventory', actions: ['read', 'create'], note: 'A ledger: corrected by a new movement, never edited.' },
  { key: 'home-page', label: 'Homepage', group: 'Storefront', actions: ['read', 'update'] },
  { key: 'site-settings', label: 'Header & footer', group: 'Storefront', actions: ['update'], note: 'Read by the storefront.' },
  { key: 'pages', label: 'Pages', group: 'Storefront', actions: ALL },
  { key: 'search-synonyms', label: 'Search synonyms', group: 'Storefront', actions: ALL },
  { key: 'newsletter-subscribers', label: 'Newsletter subscribers', group: 'Storefront', actions: ['read', 'update', 'delete'] },
  { key: 'media', label: 'Media', group: 'Library', actions: ALL },
  { key: 'datasheets', label: 'Datasheets', group: 'Library', actions: ALL },
] as const satisfies readonly Resource[]

export type ResourceKey = (typeof RESOURCES)[number]['key']

const RESOURCE_BY_KEY = new Map<string, Resource>(RESOURCES.map((resource) => [resource.key, resource]))

/** Section → granted actions, as stored on a role. */
export type Grants = Partial<Record<ResourceKey, Action[]>>

/** Permissions that cut across sections. */
export const CAPABILITIES = {
  canEditPrices: {
    label: 'Change prices, GST and delivery charges',
    description: 'Variant MRP and selling price, product GST rate, and category delivery charges. Without it, those fields are read-only even where the section can be edited.',
  },
} as const

/**
 * Only what the ceiling allows, in a stable order; anything else is dropped.
 * Creating, editing or deleting in a section implies viewing it.
 */
export const sanitiseGrants = (input: unknown): Grants => {
  const grants: Grants = {}
  if (!input || typeof input !== 'object') return grants
  for (const resource of RESOURCES) {
    const given = (input as Record<string, unknown>)[resource.key]
    if (!Array.isArray(given)) continue
    const valid = resource.actions.filter((action) => given.includes(action))
    const allowed = valid.length ? resource.actions.filter((action) => valid.includes(action) || action === 'read') : []
    if (allowed.length) grants[resource.key] = [...allowed]
  }
  return grants
}

type RoleLike = { grants?: unknown; canEditPrices?: boolean | null }
type StaffLike = { collection?: string; isActive?: boolean | null; isSuperAdmin?: boolean | null; role?: unknown }

/** The user as active staff, or undefined for customers, guests and disabled staff. */
export const staffOf = (user: unknown): StaffLike | undefined => {
  if (!user || typeof user !== 'object') return undefined
  const staff = user as StaffLike
  return staff.collection === 'users' && staff.isActive === true ? staff : undefined
}

export const isSuperAdminUser = (user: unknown): boolean => staffOf(user)?.isSuperAdmin === true

/**
 * The staff user's role, which arrives populated (the users collection's
 * `auth.depth`). An unpopulated id grants nothing rather than guessing.
 */
const roleOf = (staff: StaffLike): RoleLike | null =>
  staff.role && typeof staff.role === 'object' ? (staff.role as RoleLike) : null

/**
 * Whether this user may take this action in this section. A super admin may
 * always; a role only within the section's ceiling. Writes that nobody may
 * make (system-only ones) never ask here: their access is plain `false`.
 */
export const can = (user: unknown, key: ResourceKey, action: Action): boolean => {
  const staff = staffOf(user)
  if (!staff) return false
  if (staff.isSuperAdmin) return true
  if (!RESOURCE_BY_KEY.get(key)?.actions.includes(action)) return false
  const granted = (roleOf(staff)?.grants as Grants | undefined)?.[key]
  return Array.isArray(granted) && granted.includes(action)
}

export const canEditPrices = (user: unknown): boolean => {
  const staff = staffOf(user)
  if (!staff) return false
  return staff.isSuperAdmin === true || roleOf(staff)?.canEditPrices === true
}

/**
 * The two roles every install starts with, matching what Manager and Staff
 * could do before roles were editable. The migration creates them; tests use
 * them too.
 */
export const PRESET_ROLES = {
  Manager: {
    description: 'Runs the shop: orders, catalogue, prices, coupons and content.',
    canEditPrices: true,
    grants: {
      orders: ['read', 'create', 'update'],
      coupons: ['read', 'create', 'update'],
      carts: ['read'],
      customers: ['read', 'create', 'update'],
      addresses: ['read', 'create', 'update'],
      'auth-identities': ['read'],
      'wishlist-items': ['read'],
      'checkout-settings': ['update'],
      products: ['read', 'create', 'update'],
      'product-variants': ['read', 'create', 'update'],
      categories: ['read', 'create', 'update'],
      brands: ['read', 'create', 'update'],
      'spec-definitions': ['read', 'create', 'update'],
      reviews: ['read', 'create', 'update', 'delete'],
      inventory: ['read', 'create', 'update'],
      'stock-movements': ['read', 'create'],
      'home-page': ['read', 'update'],
      'site-settings': ['update'],
      pages: ['read', 'create', 'update'],
      'search-synonyms': ['read', 'create', 'update'],
      'newsletter-subscribers': ['read', 'update', 'delete'],
      media: ['read', 'create', 'update', 'delete'],
      datasheets: ['read', 'create', 'update', 'delete'],
    },
  },
  Staff: {
    description: 'Day-to-day help: sees orders and the catalogue, moderates reviews, records stock and uploads files.',
    canEditPrices: false,
    grants: {
      orders: ['read'],
      coupons: ['read'],
      carts: ['read'],
      customers: ['read'],
      addresses: ['read'],
      'auth-identities': ['read'],
      'wishlist-items': ['read'],
      products: ['read'],
      'product-variants': ['read'],
      categories: ['read'],
      brands: ['read'],
      'spec-definitions': ['read'],
      reviews: ['read', 'create', 'update'],
      inventory: ['read'],
      'stock-movements': ['read', 'create'],
      'home-page': ['read'],
      pages: ['read'],
      'search-synonyms': ['read'],
      'newsletter-subscribers': ['read', 'update'],
      media: ['read', 'create', 'update'],
      datasheets: ['read', 'create', 'update'],
    },
  },
} as const satisfies Record<string, { description: string; canEditPrices: boolean; grants: Grants }>
