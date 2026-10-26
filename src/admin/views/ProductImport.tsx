import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { can, canEditPrices, mayImportProducts } from '@/access/permissions'
import { ProductImportClient } from '@/admin/components/product/ProductImportClient'

/**
 * Catalogue → Import / export: add and update products from a CSV file.
 * A custom route, so it brings the admin's frame (navigation, header) itself.
 */
export const ProductImport = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const { user } = req
  if (!user) redirect('/admin/login?redirect=%2Fadmin%2Fproducts%2Fimport')

  // For the export's category filter and the list of spec columns.
  const [categories, specs] = await Promise.all([
    req.payload.find({ collection: 'categories', pagination: false, depth: 0, sort: 'name', select: { name: true, slug: true }, overrideAccess: true }),
    req.payload.find({
      collection: 'spec-definitions',
      pagination: false,
      depth: 0,
      sort: ['group', 'sortOrder', 'label'],
      select: { key: true, label: true, unit: true, type: true },
      overrideAccess: true,
    }),
  ])

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      {mayImportProducts(user) ? (
        <ProductImportClient
          may={{
            export: can(user, 'products', 'read'),
            prices: canEditPrices(user),
            stock: can(user, 'stock-movements', 'create'),
          }}
          categories={categories.docs.map(({ id, name, slug }) => ({ id, name, slug }))}
          specs={specs.docs.map(({ key, label, unit, type }) => ({ key, label, unit: unit ?? null, type }))}
        />
      ) : (
        <p style={{ padding: 'var(--base) var(--gutter-h)' }}>Your role can’t add or edit products, so it can’t import them.</p>
      )}
    </DefaultTemplate>
  )
}

export default ProductImport
