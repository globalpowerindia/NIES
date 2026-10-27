import type { Payload } from 'payload'

import type { CategoryTile } from '@/components/sections/CategoryZone'
import { relId } from '@/lib/relations'
import { CategoryZone } from '@/components/sections/CategoryZone'
import { AppPromo } from '@/components/sections/AppPromo'
import { BannerRow, WideBanner } from '@/components/sections/Banner'
import { CatalogueBanner } from '@/components/sections/CatalogueBanner'
import { CollectionShowcase, type CollectionItem } from '@/components/sections/CollectionShowcase'
import { HeroCarousel } from '@/components/sections/HeroCarousel'
import { Newsletter } from '@/components/sections/Newsletter'
import { ProductCarousel } from '@/components/sections/ProductCarousel'
import { TrustedBrands, type TrustedBrand } from '@/components/sections/TrustedBrands'
import { ValueProps } from '@/components/sections/ValueProps'
import { bannerOf, fileUrlOf, hrefOf, isBanner, mediaOf } from '@/lib/storefront/content'
import { getCarouselCards, toProductCards } from '@/lib/storefront/products'
import type { Brand, Category, HomePage, Product } from '@/payload-types'

type Section = NonNullable<HomePage['sections']>[number]

const populated = <T,>(values: (number | T)[] | null | undefined): T[] =>
  (values ?? []).filter((value): value is T => typeof value === 'object' && value !== null)

/**
 * Renders one homepage section. Each branch fetches only what that section
 * needs, and every section can render nothing (empty carousel, missing image)
 * rather than a broken box — staff can publish half-finished sections safely.
 */
const renderSection = async (payload: Payload, section: Section) => {
  switch (section.blockType) {
    case 'heroCarousel': {
      const slides = (section.slides ?? []).map(bannerOf).filter(isBanner)
      return slides.length ? (
        <div className="pt-[0.875rem] md:pt-[1.4375rem]">
          <HeroCarousel slides={slides} />
        </div>
      ) : null
    }

    case 'bannerRow':
      return <BannerRow banners={(section.banners ?? []).map(bannerOf).filter(isBanner)} />

    case 'wideBanner': {
      const banner = bannerOf(section)
      return banner ? <WideBanner banner={banner} shape={section.shape ?? 'feature'} /> : null
    }

    case 'productCarousel': {
      const products = await getCarouselCards(payload, {
        source: section.source,
        limit: section.limit ?? 12,
        categoryId: relId(section.category),
        productIds: (section.products ?? []).map(relId).filter((id): id is number => id !== undefined),
      })
      return products.length ? (
        <ProductCarousel
          eyebrow={section.eyebrow ?? undefined}
          title={section.title ?? undefined}
          description={section.description ?? undefined}
          products={products}
        />
      ) : null
    }

    case 'categoryGrid': {
      const tiles: CategoryTile[] = (section.tiles ?? []).flatMap((tile) => {
        const category = typeof tile.category === 'object' ? (tile.category as Category) : null
        const image = mediaOf(tile.image) ?? mediaOf(category?.image)
        if (!category || !image) return []
        return [
          {
            title: tile.title || category.name,
            linkLabel: tile.linkLabel || `Explore ${category.name}`,
            href: `/category/${category.slug}`,
            image: image.url,
          },
        ]
      })
      return tiles.length ? (
        <CategoryZone
          eyebrow={section.eyebrow ?? undefined}
          title={section.title ?? undefined}
          description={section.description ?? undefined}
          categories={tiles}
        />
      ) : null
    }

    case 'collectionShowcase': {
      const featureImage = mediaOf(section.featureImage)
      const video = section.featureType === 'video' ? section.featureVideo : null
      const featureVideo =
        video && typeof video === 'object' && video.url ? { url: video.url, mimeType: video.mimeType ?? undefined } : null
      const cards = await toProductCards(payload, populated<Product>(section.products))
      if ((!featureImage && !featureVideo) || cards.length === 0) return null
      const items: CollectionItem[] = cards.map((card) => ({
        href: card.href,
        imageUrl: card.imageUrl,
        name: card.label,
        pricePaise: card.pricePaise,
      }))
      return (
        <CollectionShowcase
          eyebrow={section.eyebrow ?? undefined}
          title={section.title ?? undefined}
          description={section.description ?? undefined}
          featureImage={featureImage?.url}
          featureVideo={featureVideo}
          items={items}
          ctaLabel={section.buttonLabel ?? undefined}
          ctaHref={hrefOf(section.buttonLink)}
        />
      )
    }

    case 'catalogueBanner': {
      const image = mediaOf(section.image)
      return image ? (
        <CatalogueBanner
          title={section.title ?? undefined}
          description={section.description ?? undefined}
          buttonLabel={section.buttonLabel ?? undefined}
          href={fileUrlOf(section.file) ?? hrefOf(section.buttonLink)}
          isDownload={Boolean(fileUrlOf(section.file))}
          image={image}
        />
      ) : null
    }

    case 'valueProps':
      return (
        <ValueProps
          eyebrow={section.eyebrow ?? undefined}
          title={section.title ?? undefined}
          description={section.description ?? undefined}
          items={(section.items ?? []).map((item) => ({
            iconUrl: mediaOf(item.icon)?.url ?? null,
            title: item.title,
            text: item.text ?? undefined,
          }))}
        />
      )

    case 'trustedBrands': {
      let brands = populated<Brand>(section.brands)
      if (brands.length === 0) {
        const all = await payload.find({
          collection: 'brands',
          where: { isActive: { equals: true } },
          sort: 'sortOrder',
          limit: 30,
          depth: 1,
        })
        brands = all.docs
      }
      const logos: TrustedBrand[] = brands.flatMap((brand) => {
        const logo = mediaOf(brand.logo)
        return logo ? [{ name: brand.name, logo }] : []
      })
      return (
        <TrustedBrands title={section.title ?? undefined} description={section.description ?? undefined} brands={logos} />
      )
    }

    case 'appPromo':
      return (
        <AppPromo
          title={section.title ?? undefined}
          description={section.description ?? undefined}
          screenshot={mediaOf(section.screenshot)}
          googlePlayUrl={section.googlePlayUrl}
          appStoreUrl={section.appStoreUrl}
        />
      )

    case 'newsletter':
      return <Newsletter title={section.title ?? undefined} description={section.description ?? undefined} />

    default:
      return null
  }
}

export const HomeSections = async ({ payload, sections }: { payload: Payload; sections: Section[] }) => {
  const visible = sections.filter((section) => !section.hidden)
  const rendered = await Promise.all(visible.map((section) => renderSection(payload, section)))
  return (
    <>
      {rendered.map((node, index) => (
        <div key={visible[index].id ?? index} className="contents">
          {node}
        </div>
      ))}
    </>
  )
}
