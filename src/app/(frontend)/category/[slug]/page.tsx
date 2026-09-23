import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { Crumb } from '@/components/catalog/Breadcrumbs'
import { CatalogPage } from '@/components/catalog/CatalogPage'
import type { CategoryFilter } from '@/components/catalog/CatalogFilters'
import { getCategoryTree, type CategoryNode } from '@/lib/storefront/catalog'
import { mediaOf } from '@/lib/storefront/content'
import { parseListingParams } from '@/lib/storefront/listing-params'

const ancestorsOf = (node: CategoryNode, byId: Map<number, CategoryNode>): CategoryNode[] => {
  const chain: CategoryNode[] = []
  let parent = node.parentId !== undefined ? byId.get(node.parentId) : undefined
  while (parent && !chain.includes(parent)) {
    chain.unshift(parent)
    parent = parent.parentId !== undefined ? byId.get(parent.parentId) : undefined
  }
  return chain
}

export async function generateMetadata(props: PageProps<'/category/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const category = (await getCategoryTree()).bySlug.get(slug)
  if (!category) return {}
  return {
    title: category.name,
    description: category.description || `Shop ${category.name} online with GST invoice and fast delivery.`,
  }
}

export default async function CategoryPage(props: PageProps<'/category/[slug]'>) {
  const [{ slug }, raw] = await Promise.all([props.params, props.searchParams])
  const tree = await getCategoryTree()
  const category = tree.bySlug.get(slug)
  if (!category) notFound()

  const ancestors = ancestorsOf(category, tree.byId)
  const parent = ancestors.at(-1)
  const children = tree.children.get(category.id) ?? []
  const scopeIds = tree.descendantIds(category.id)
  const href = (node: CategoryNode) => `/category/${node.slug}`

  let categoryFilter: CategoryFilter | null = null
  if (children.length) {
    const childSlugs = children.map((child) => child.slug)
    categoryFilter = {
      mode: 'filter',
      allLabel: `All ${category.name}`,
      allHref: href(category),
      options: children.map((child) => ({ slug: child.slug, name: child.name, href: href(child) })),
      selected: parseListingParams(raw).sub.filter((sub) => childSlugs.includes(sub)),
    }
  } else if (parent) {
    categoryFilter = {
      mode: 'navigate',
      allLabel: `All ${parent.name}`,
      allHref: href(parent),
      options: (tree.children.get(parent.id) ?? []).map((sibling) => ({
        slug: sibling.slug,
        name: sibling.name,
        href: href(sibling),
      })),
      selected: [category.slug],
    }
  }

  // A sub-category without its own banner borrows the nearest ancestor's.
  const banner = [category, ...[...ancestors].reverse()].map((node) => mediaOf(node.bannerImage)).find(Boolean) ?? null

  return (
    <CatalogPage
      basePath={href(category)}
      title={category.name}
      banner={banner}
      breadcrumbs={[...ancestors.map((node): Crumb => ({ label: node.name, href: href(node) })), { label: category.name }]}
      scopeIds={scopeIds}
      resolveSub={
        children.length
          ? (slugs) =>
              slugs.flatMap((sub) => {
                const node = tree.bySlug.get(sub)
                return node && scopeIds.includes(node.id) ? tree.descendantIds(node.id) : []
              })
          : null
      }
      categoryFilter={categoryFilter}
      raw={raw}
    />
  )
}
