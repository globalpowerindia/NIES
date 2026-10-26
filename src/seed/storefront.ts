import path from 'path'
import { getPayload, type Payload } from 'payload'
import { fileURLToPath } from 'url'

import { toSlug } from '../fields/slug.js'
import config from '../payload.config.js'
import { BRANDS, trimmedLogo, trimmedLogoName } from './brand-logos.js'

/**
 * Fills an empty database with the catalogue, stock, homepage and header /
 * footer from the Figma design, so the storefront and admin can be reviewed
 * end to end. Safe to re-run: existing records are matched by slug, SKU or
 * filename and left alone.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.resolve(dirname, '../../public')
// A fresh context per call: the storage plugin keeps per-upload state on
// `req.context`, so one shared object would carry the first upload's state
// into the next and silently skip uploading its file.
const quiet = () => ({ context: { skipRevalidate: true } })

const mediaCache = new Map<string, number>()

const upload = async (payload: Payload, file: string, alt: string): Promise<number> => {
  const cached = mediaCache.get(file)
  if (cached) return cached
  const filename = path.basename(file)
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
  })
  const id =
    existing.docs[0]?.id ??
    (
      await payload.create({
        collection: 'media',
        data: { alt },
        filePath: path.join(PUBLIC, file),
        ...quiet(),
      })
    ).id
  mediaCache.set(file, id)
  return id
}

/** Uploads a brand's trimmed logo under a distinct name, so a re-run is idempotent. */
const uploadTrimmedLogo = async (
  payload: Payload,
  file: string,
  alt: string,
  crop?: { from: number; to: number },
): Promise<number> => {
  const name = trimmedLogoName(file, crop)
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: name } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) return existing.docs[0].id
  const data = await trimmedLogo(path.join(PUBLIC, file), crop)
  const doc = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: 'image/png', name, size: data.length },
    ...quiet(),
  })
  return doc.id
}

const findOrCreate = async <T extends { id: number }>(
  lookup: () => Promise<{ docs: T[] }>,
  create: () => Promise<T>,
): Promise<{ doc: T; created: boolean }> => {
  const found = (await lookup()).docs[0]
  return found ? { doc: found, created: false } : { doc: await create(), created: true }
}


const TOP_CATEGORIES = [
  'Power Tools',
  'Pressure Wash',
  'Welding Machines',
  'Air Compressor',
  'Airless Paint Sprayer',
  'Vacuum Cleaner',
  'Agricultural Products',
  'Generators',
  'Spares & Accessories',
]

const POWER_TOOL_TYPES = [
  'Electric Drills',
  'Angle Grinders',
  'Marble Cutters',
  'Rotary Hammers',
  'Demolition Hammers',
  'Electric Polisher',
]

const SPECS = [
  {
    key: 'ratedInputPower',
    label: 'Rated Input Power',
    unit: 'W',
    type: 'NUMBER',
    group: 'Motor',
    isFilter: true,
    isSummary: true,
  },
  {
    key: 'ratedVoltage',
    label: 'Rated Voltage',
    unit: '',
    type: 'TEXT',
    group: 'Electrical',
    isSummary: true,
  },
  {
    key: 'maxDrillDiameter',
    label: 'Max Drill Diameter',
    unit: '',
    type: 'TEXT',
    group: 'Capacity',
    isSummary: true,
  },
  {
    key: 'ratedFrequency',
    label: 'Rated Frequency',
    unit: '',
    type: 'TEXT',
    group: 'Electrical',
    isSummary: true,
  },
  {
    key: 'noLoadSpeed',
    label: 'No-load Speed',
    unit: '',
    type: 'TEXT',
    group: 'Motor',
    isSummary: true,
  },
  {
    key: 'chuckType',
    label: 'Chuck Type',
    unit: '',
    type: 'TEXT',
    group: 'General',
    isFilter: true,
  },
  { key: 'speedControl', label: 'Speed Control', unit: '', type: 'BOOLEAN', group: 'General' },
  { key: 'netWeight', label: 'Net Weight', unit: 'kg', type: 'NUMBER', group: 'Physical' },
] as const

type ProductSeed = {
  name: string
  model: string
  brand: string
  category: string
  image: string
  mrp: number
  price: number
  badges: ('NEW' | 'BEST_SELLER')[]
  stock: number
  power: number
}

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Electric Drill - GPG - 6D',
    model: 'GPG-6D',
    brand: 'Global Power',
    category: 'Electric Drills',
    image: 'products/sample-drill.png',
    mrp: 2_000_000,
    price: 1_000_000,
    badges: ['NEW'],
    stock: 40,
    power: 450,
  },
  {
    name: 'Electric Drill - GPG - 10D',
    model: 'GPG-10D',
    brand: 'Global Power',
    category: 'Electric Drills',
    image: 'products/sample-drill.png',
    mrp: 280_000,
    price: 189_000,
    badges: ['BEST_SELLER'],
    stock: 25,
    power: 600,
  },
  {
    name: 'Electric Drill 10MM - HCC6110',
    model: 'HCC6110',
    brand: 'HCC',
    category: 'Electric Drills',
    image: 'products/hcc-drill.png',
    mrp: 220_000,
    price: 165_000,
    badges: ['BEST_SELLER'],
    stock: 18,
    power: 500,
  },
  {
    name: 'Angle Grinder 100MM - HCC6113',
    model: 'HCC6113',
    brand: 'HCC',
    category: 'Angle Grinders',
    image: 'products/hcc-drill.png',
    mrp: 250_000,
    price: 189_000,
    badges: ['NEW', 'BEST_SELLER'],
    stock: 3,
    power: 850,
  },
  {
    name: 'Rotary Hammer 26MM - HCC6120',
    model: 'HCC6120',
    brand: 'HCC',
    category: 'Rotary Hammers',
    image: 'products/hcc-drill.png',
    mrp: 620_000,
    price: 479_000,
    badges: ['BEST_SELLER'],
    stock: 9,
    power: 800,
  },
  {
    name: 'Impact Drill 13MM - Intough ID13',
    model: 'ID13',
    brand: 'Intough',
    category: 'Electric Drills',
    image: 'products/sample-drill.png',
    mrp: 310_000,
    price: 245_000,
    badges: ['NEW'],
    stock: 0,
    power: 710,
  },
  {
    name: 'Marble Cutter 110MM - Eastman EMC110',
    model: 'EMC110',
    brand: 'Eastman',
    category: 'Marble Cutters',
    image: 'products/sample-drill.png',
    mrp: 360_000,
    price: 299_000,
    badges: ['NEW'],
    stock: 12,
    power: 1200,
  },
  {
    name: 'Demolition Hammer - Dong Cheng DZG15',
    model: 'DZG15',
    brand: 'Dong Cheng',
    category: 'Demolition Hammers',
    image: 'products/sample-drill.png',
    mrp: 1_450_000,
    price: 1_199_000,
    badges: ['BEST_SELLER'],
    stock: 0,
    power: 1500,
  },
  {
    name: 'Electric Polisher 180MM - GPP180',
    model: 'GPP180',
    brand: 'Global Power',
    category: 'Electric Polisher',
    image: 'products/sample-drill.png',
    mrp: 540_000,
    price: 399_000,
    badges: ['NEW'],
    stock: 7,
    power: 1400,
  },
]

const run = async () => {
  const payload = await getPayload({ config })
  const log = (message: string) => payload.logger.info(`[seed] ${message}`)

  // Brands
  const brandIds = new Map<string, number>()
  for (const [index, brand] of BRANDS.entries()) {
    const logo = await uploadTrimmedLogo(payload, brand.logo, `${brand.name} logo`, brand.crop)
    const { doc, created } = await findOrCreate(
      () =>
        payload.find({
          collection: 'brands',
          where: { name: { equals: brand.name } },
          limit: 1,
          depth: 0,
        }),
      () =>
        payload.create({
          collection: 'brands',
          data: { name: brand.name, slug: toSlug(brand.name), logo, sortOrder: index },
          ...quiet(),
        }),
    )
    if (!created)
      await payload.update({
        collection: 'brands',
        id: doc.id,
        data: { logo, sortOrder: index },
        ...quiet(),
      })
    brandIds.set(brand.name, doc.id)
  }
  log(`${brandIds.size} brands`)

  // Categories: nine top-level, with power tool types underneath. Tile images from the design.
  const tileImage = await upload(payload, 'categories/electric-drill.png', 'Electric drill')
  const CATEGORY_IMAGES: Record<string, [string, string]> = {
    'Electric Drills': ['categories/electric-drill.png', 'Electric drill'],
    'Pressure Wash': ['categories/tile-pressure-washer.png', 'Pressure washer'],
    'Vacuum Cleaner': ['categories/tile-vacuum-cleaner.png', 'Vacuum cleaner'],
    'Welding Machines': ['categories/tile-welding-machine.png', 'Welding machine'],
    'Air Compressor': ['categories/tile-air-compressor.png', 'Air compressor'],
    'Spares & Accessories': ['categories/tile-tools-accessories.png', 'Tools and accessories'],
  }
  const categoryIds = new Map<string, number>()
  const ensureCategory = async (name: string, sortOrder: number, parent?: number) => {
    const { doc } = await findOrCreate(
      () =>
        payload.find({
          collection: 'categories',
          where: { name: { equals: name } },
          limit: 1,
          depth: 0,
        }),
      () =>
        payload.create({
          collection: 'categories',
          data: { name, slug: toSlug(name), sortOrder, parent, image: tileImage },
          ...quiet(),
        }),
    )
    categoryIds.set(name, doc.id)
    const image = CATEGORY_IMAGES[name]
    if (image) {
      await payload.update({
        collection: 'categories',
        id: doc.id,
        data: { image: await upload(payload, ...image) },
        ...quiet(),
      })
    }
  }
  for (const [index, name] of TOP_CATEGORIES.entries()) await ensureCategory(name, index)
  for (const [index, name] of POWER_TOOL_TYPES.entries()) {
    await ensureCategory(name, index, categoryIds.get('Power Tools'))
  }
  // Wide banner on the category page; sub-categories borrow it.
  await payload.update({
    collection: 'categories',
    id: categoryIds.get('Power Tools')!,
    data: {
      bannerImage: await upload(
        payload,
        'banners/category-power-tools.png',
        'Drilling into timber',
      ),
    },
    ...quiet(),
  })
  log(`${categoryIds.size} categories`)

  // Spec registry
  const specIds = new Map<string, number>()
  for (const [index, spec] of SPECS.entries()) {
    const { doc } = await findOrCreate(
      () =>
        payload.find({
          collection: 'spec-definitions',
          where: { key: { equals: spec.key } },
          limit: 1,
          depth: 0,
        }),
      () =>
        payload.create({
          collection: 'spec-definitions',
          data: { ...spec, sortOrder: index },
          ...quiet(),
        }),
    )
    specIds.set(spec.key, doc.id)
  }

  // Products, one variant each, opening stock recorded as a movement
  const productIds = new Map<string, number>()
  for (const [index, seed] of PRODUCTS.entries()) {
    const image = await upload(payload, seed.image, seed.name)
    const { doc: product, created } = await findOrCreate(
      () =>
        payload.find({
          collection: 'products',
          where: { name: { equals: seed.name } },
          limit: 1,
          depth: 0,
        }),
      () =>
        payload.create({
          collection: 'products',
          data: {
            name: seed.name,
            slug: toSlug(seed.name),
            status: 'ACTIVE',
            sortOrder: index,
            subtitle: `Professional heavy-duty ${seed.category.replace(/s$/, '').toLowerCase()}`,
            modelNumber: seed.model,
            badges: seed.badges,
            images: [image],
            shortDesc: `${seed.name} by ${seed.brand}, ${seed.power}W, with ${6} months warranty.`,
            category: categoryIds.get(seed.category)!,
            brand: brandIds.get(seed.brand),
            countryOfOrigin: 'India',
            freeAccessories:
              seed.category === 'Electric Drills'
                ? [
                    { name: 'Chuck', quantity: '1 nos.' },
                    { name: 'Carbon Brush', quantity: '1 pair' },
                  ]
                : [],
            specValues: [
              { definition: specIds.get('ratedInputPower')!, valueNum: seed.power * 100 },
              { definition: specIds.get('ratedVoltage')!, valueText: '220V ~' },
              { definition: specIds.get('maxDrillDiameter')!, valueText: 'Steel 10mm Wood 25mm' },
              { definition: specIds.get('ratedFrequency')!, valueText: '60/50Hz' },
              { definition: specIds.get('noLoadSpeed')!, valueText: '0 ~ 3300r/min' },
              { definition: specIds.get('chuckType')!, valueText: 'Keyless' },
              { definition: specIds.get('speedControl')!, valueBool: true },
            ],
            hsnCode: '8467',
            gstRateBps: 1800,
            warrantyMonths: 6,
          },
          ...quiet(),
        }),
    )
    productIds.set(seed.name, product.id)
    if (!created) continue

    const variant = await payload.create({
      collection: 'product-variants',
      data: {
        product: product.id,
        sku: seed.model,
        name: 'Standard',
        powerSource: 'CORDED',
        packType: 'BARE_TOOL',
        mrpPaise: seed.mrp,
        sellingPricePaise: seed.price,
        isDefault: true,
      },
      ...quiet(),
    })
    if (seed.stock > 0) {
      await payload.create({
        collection: 'stock-movements',
        data: {
          variant: variant.id,
          type: 'RECEIVED',
          quantity: seed.stock,
          note: 'Opening stock (seed)',
        },
        ...quiet(),
      })
    }
  }
  log(`${productIds.size} products`)

  // The product page design's extras, on the drill it was drawn with. Re-applied
  // on every run so reseeding an older database picks them up too.
  const demoDrill = productIds.get('Electric Drill - GPG - 6D')!
  await payload.update({
    collection: 'products',
    id: demoDrill,
    data: {
      images: [
        await upload(payload, 'products/sample-drill.png', 'Electric Drill - GPG - 6D'),
        await upload(
          payload,
          'product-page/drill-angle-2.png',
          'Electric Drill GPG-6D, rear three-quarter view',
        ),
        await upload(payload, 'product-page/drill-angle-3.png', 'Electric Drill GPG-6D, left side'),
        await upload(
          payload,
          'product-page/drill-angle-4.png',
          'Electric Drill GPG-6D, front three-quarter view',
        ),
      ],
      freeAccessories: [
        {
          name: 'Chuck',
          quantity: '1 nos.',
          image: await upload(payload, 'product-page/accessory-chuck.png', 'Drill chuck with key'),
        },
        {
          name: 'Carbon Brush',
          quantity: '1 pair',
          image: await upload(
            payload,
            'product-page/accessory-carbon-brush.png',
            'Pair of carbon brushes',
          ),
        },
      ],
      brochureBanner: await upload(
        payload,
        'product-page/brochure-banner.png',
        'Product brochure: power, precision, performance',
      ),
      applications: {
        title: 'Drilling Applications',
        items: [
          {
            label: 'Wood',
            image: await upload(payload, 'product-page/application-wood.png', 'Drilling into wood'),
          },
          {
            label: 'Metal',
            image: await upload(
              payload,
              'product-page/application-metal.png',
              'Drilling into a metal frame',
            ),
          },
          {
            label: 'Plastic',
            image: await upload(
              payload,
              'product-page/application-plastic.png',
              'Drilling into plastic',
            ),
          },
          {
            label: 'General',
            image: await upload(
              payload,
              'product-page/application-general.png',
              'General workshop drilling',
            ),
          },
        ],
      },
      promoImages: [
        await upload(
          payload,
          'product-page/feature-banner.png',
          'Powerful drilling, effortless results: high torque, long-lasting battery, lightweight, multiple speed settings',
        ),
      ],
    },
    ...quiet(),
  })
  log('product page extras on the demo drill')

  // Homepage
  const media = async (file: string, alt: string) => upload(payload, file, alt)
  const category = (name: string) => ({
    type: 'category' as const,
    category: categoryIds.get(name),
  })

  // Icons are decorative next to their headings, but Media requires alt text.
  const valueIcons = await Promise.all(
    ['tools', 'shipping', 'quality', 'payment', 'trust', 'help'].map((icon) =>
      media(`icons/${icon}.svg`, `${icon} icon`),
    ),
  )

  await payload.updateGlobal({
    slug: 'home-page',
    data: {
      _status: 'published',
      sections: [
        {
          blockType: 'heroCarousel',
          blockName: 'Hero slides',
          slides: [
            {
              image: await media('banners/hero-welding.png', 'Welding machine'),
              link: category('Welding Machines'),
              overlay: {
                heading: 'Welding Machine',
                buttonLabel: 'View Products',
                buttonStyle: 'blue',
                position: 'right',
                textTone: 'dark',
              },
            },
            {
              image: await media('banners/hero-sander.png', 'Electric sander'),
              link: category('Power Tools'),
              overlay: {
                heading: 'Electric Sander',
                buttonLabel: 'View Products',
                buttonStyle: 'red',
                position: 'right',
                textTone: 'light',
              },
            },
          ],
        },
        {
          blockType: 'bannerRow',
          blockName: 'Pressure washer + vacuum banners',
          banners: [
            {
              image: await media('banners/pressure-washer.png', 'Pressure washer'),
              link: category('Pressure Wash'),
              overlay: {
                heading: 'High Performing\nPressure Washers',
                buttonLabel: 'View Products',
                buttonStyle: 'blue',
                position: 'right',
              },
            },
            {
              image: await media('banners/vacuum-cleaner.png', 'Vacuum cleaner'),
              link: category('Vacuum Cleaner'),
              overlay: {
                heading: 'Extra Power\nVacuum Cleaners',
                buttonLabel: 'View Products',
                buttonStyle: 'red',
                position: 'right',
              },
            },
          ],
        },
        {
          blockType: 'productCarousel',
          blockName: 'New In',
          eyebrow: 'New In',
          title: 'Newly Launched Products',
          description:
            'Explore newly launched products engineered for superior performance, enhanced durability, and professional-grade reliability.',
          source: 'new',
          limit: 12,
        },
        {
          blockType: 'categoryGrid',
          blockName: 'Category Zone',
          eyebrow: 'Category Zone',
          title: 'Explore Wide Range Of Categories',
          description:
            'Browse an extensive collection of premium tools and machinery designed for professionals, industries, and DIY enthusiasts.',
          tiles: [
            {
              category: categoryIds.get('Electric Drills')!,
              title: 'Electric Drills From - ₹1000',
            },
            {
              category: categoryIds.get('Pressure Wash')!,
              title: 'Pressure washers From - ₹6000',
              linkLabel: 'Explore Pressure Washers',
            },
            {
              category: categoryIds.get('Vacuum Cleaner')!,
              title: 'Vacuum Cleaners From - ₹1500',
              linkLabel: 'Explore Vacuum Cleaners',
            },
            {
              category: categoryIds.get('Welding Machines')!,
              title: 'Welding Machines From - ₹9000',
            },
            {
              category: categoryIds.get('Air Compressor')!,
              title: 'Air Compressor From - ₹12000',
              linkLabel: 'Explore Air Compressors',
            },
            {
              category: categoryIds.get('Spares & Accessories')!,
              title: 'Tools Accessories From - ₹1500',
              linkLabel: 'Explore Tools Accessories',
            },
          ],
        },
        {
          blockType: 'productCarousel',
          blockName: 'Best sellers',
          eyebrow: 'Top Moving Products',
          title: 'Our Best Selling Products',
          source: 'bestSeller',
          limit: 12,
        },
        {
          blockType: 'collectionShowcase',
          blockName: 'HCC collection',
          eyebrow: 'HCC Power Tools',
          title: 'Our Special HCC Collections',
          description:
            'Engineered for performance and durability, our comprehensive range of electric drills, grinders, hammers, cutters, chainsaws, sanders, polishers, and specialty tools delivers the power professionals trust every day.',
          featureImage: await media('categories/hcc-feature.png', 'HCC power tools'),
          products: [
            'Electric Drill 10MM - HCC6110',
            'Angle Grinder 100MM - HCC6113',
            'Rotary Hammer 26MM - HCC6120',
          ].map((name) => productIds.get(name)!),
          buttonLabel: 'View More Products',
          buttonLink: category('Power Tools'),
        },
        {
          blockType: 'catalogueBanner',
          blockName: 'Catalogue download',
          title: 'Download our Product Catalogue',
          description:
            'Browse our comprehensive product catalogue featuring premium tools, machinery, and accessories with detailed specifications to help you choose the right equipment for every job.',
          buttonLabel: 'Download Catalogue',
          // Until the catalogue PDF is uploaded, the button goes to the catalogue page.
          buttonLink: { type: 'custom', url: '/catalogue' },
          image: await media('banners/catalogue.jpg', 'Professional power tools'),
        },
        {
          blockType: 'valueProps',
          blockName: 'Why choose us',
          eyebrow: 'Why Choose Us',
          title: 'Reasons to Choose Us',
          description:
            'We are more than just a power tools and machinery store—we are your reliable partner for every project, from home improvements to large-scale industrial operations.',
          items: [
            { title: 'Great Value', text: 'Competitive price of 100 of products.' },
            {
              title: 'Nation Wide Shipping',
              text: 'Provide nation wide shipping for all products.',
            },
            { title: 'Assured Quality', text: 'Quality and secure payment methods.' },
            {
              title: 'Trusted Payment',
              text: "Pay with the world's most popular and secure payment methods.",
            },
            {
              title: 'Shop with Confidence',
              text: 'Our Buyer Protection policy covers your entire purchase journey.',
            },
            { title: 'Help Center', text: 'Browse our FAQs or submit your query here.' },
          ].map((item, index) => ({ ...item, icon: valueIcons[index] })),
        },
        {
          blockType: 'wideBanner',
          blockName: 'Agricultural banner',
          shape: 'feature',
          image: await media('banners/agri-field.png', 'Agricultural tools in a field'),
          link: category('Agricultural Products'),
          overlay: {
            heading: 'Built For the Field\nEngineered for Performance',
            subheading: 'Professional Agricultural Tools & Equipment for Every Season',
            buttonLabel: 'View Products',
            buttonStyle: 'red',
          },
        },
        {
          // Offer artwork has its text baked in. Hidden until the finished
          // image from the design team is uploaded here.
          blockType: 'wideBanner',
          blockName: 'Offer strip (hidden: upload final artwork)',
          hidden: true,
          shape: 'strip',
          image: await media('banners/promo-strip.png', 'Get 50% off, up to ₹200 off. T&C apply.'),
          link: { type: 'custom', url: '/offers' },
        },
        {
          blockType: 'productCarousel',
          // No heading in the design: the offer strip above introduces it.
          blockName: 'Deals (under the offer strip)',
          source: 'offers',
          limit: 12,
        },
        {
          blockType: 'bannerRow',
          blockName: 'Drill + welding banners (hidden: upload final artwork)',
          hidden: true,
          banners: [
            {
              image: await media(
                'banners/promo-drill.png',
                'Powerful, precise, built to perform — electric drills',
              ),
              link: category('Electric Drills'),
            },
            {
              image: await media(
                'banners/promo-welding.png',
                'Built strong, welds stronger — welding machines',
              ),
              link: category('Welding Machines'),
            },
          ],
        },
        {
          blockType: 'bannerRow',
          blockName: 'Compressor + vacuum banners (hidden: upload final artwork)',
          hidden: true,
          banners: [
            {
              image: await media(
                'banners/promo-compressor.png',
                'Power, performance, perfection — air compressors',
              ),
              link: category('Air Compressor'),
            },
            {
              image: await media(
                'banners/promo-vacuum.png',
                'Powerful cleaning, effortless results — vacuum cleaners',
              ),
              link: category('Vacuum Cleaner'),
            },
          ],
        },
        {
          blockType: 'appPromo',
          blockName: 'App download banner',
          title: 'Shop with Ease on the Tools Hypermarket App',
          description: 'Browse, compare, and order your tools anytime, anywhere.',
          screenshot: await media('app-promo/screen.png', 'Tools Hypermarket app home screen'),
          // Placeholders: replace with the real store listings once the app is published.
          googlePlayUrl: 'https://play.google.com/store/apps',
          appStoreUrl: 'https://www.apple.com/app-store/',
        },
        {
          blockType: 'trustedBrands',
          blockName: 'Trusted brands',
          title: 'Our Trusted Brands',
          description:
            'We bring together leading brands to ensure you receive authentic, high-quality tools backed by proven performance and dependable support.',
        },
        {
          blockType: 'newsletter',
          blockName: 'Newsletter',
          title: 'Be the First to Know',
          description:
            'Sign up to receive news on the hottest new arrivals, our exclusive collections, must-know tool tips and more',
        },
      ],
    },
    ...quiet(),
  })
  log('homepage published')

  // Header & footer
  const certifications = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7].map((n) => media(`brand/cert-${n}.png`, 'Certification')),
  )
  const custom = (url: string) => ({ type: 'custom' as const, url })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Tools Hypermarket',
      logo: await media('brand/logo.png', 'Tools Hypermarket'),
      offers: [
        { text: 'Save Up to 40% on Selected Power Tools.' },
        { text: 'EMI Available on selected products.' },
        { text: 'Shipping worldwide' },
      ],
      utilityLinks: [
        { label: 'Price List', icon: 'rupee', link: custom('/price-list') },
        { label: 'Download Catalogue', icon: 'book', link: custom('/catalogue') },
        { label: 'Download App', icon: 'phone', link: custom('/app') },
      ],
      navCategories: TOP_CATEGORIES.map((name) => categoryIds.get(name)!),
      // (search synonyms are seeded separately, below)
      // The tiles under the search box. Linked to searches rather than
      // categories so staff can feature anything without a category existing
      // for it; every one of these is editable in Header & Footer → Search.
      topMovingProducts: await Promise.all(
        [
          { label: 'HCC Power Tools', file: 'hcc-power-tools.png' },
          { label: 'Gold Drills', file: 'gold-drills.png' },
          { label: 'Economic Vacuums', file: 'economic-vacuums.png' },
          { label: 'Bush Cutters', file: 'bush-cutters.png' },
          { label: 'Domestic Pressure Washer', file: 'domestic-pressure-washer.png' },
          { label: 'Gold Angle Polisher', file: 'gold-angle-polisher.png' },
        ].map(async ({ label, file }) => ({
          label,
          image: await media(`search/${file}`, label),
          link: custom(`/search?q=${encodeURIComponent(label)}`),
        })),
      ),
      footerColumns: [
        {
          heading: 'Information',
          links: [
            { label: 'About Us', link: custom('/about') },
            { label: 'Delivery Information', link: custom('/delivery') },
            { label: 'Privacy Policy', link: custom('/privacy') },
            { label: 'Return Policy', link: custom('/returns') },
            { label: 'Terms & Conditions', link: custom('/terms') },
            { label: 'Contact Us', link: custom('/contact') },
          ],
        },
        {
          heading: 'Top Categories',
          links: [
            { label: 'Global Power Tools', link: custom('/brand/global-power') },
            { label: 'HCC Power Tools', link: custom('/brand/hcc') },
            { label: 'Cordless Tools', link: custom('/search?q=cordless') },
            { label: 'Pressure Wash', link: category('Pressure Wash') },
            { label: 'Welding Machines', link: category('Welding Machines') },
            { label: 'Air Compressor', link: category('Air Compressor') },
            { label: 'All Products', link: custom('/products') },
          ],
        },
        {
          heading: 'My Account',
          links: [
            { label: 'My Profile', link: custom('/account') },
            { label: 'Order History', link: custom('/account/orders') },
            { label: 'Wishlist', link: custom('/account/wishlist') },
          ],
        },
      ],
      socialLinks: [
        { platform: 'facebook', url: 'https://facebook.com' },
        { platform: 'instagram', url: 'https://instagram.com' },
        { platform: 'whatsapp', url: 'https://wa.me/917034127770' },
        { platform: 'youtube', url: 'https://youtube.com' },
      ],
      tollFreeNumber: '+91 70341 27770',
      whatsappNumber: '917034127770',
      certifications,
      paymentMethodsImage: await media(
        'brand/payment-methods.png',
        'Cards, UPI, net banking and cash on delivery',
      ),
    },
    ...quiet(),
  })
  log('header & footer saved')

  // A starting set of synonyms. Staff extend this from the searches that come
  // back empty; each group is bidirectional.
  const synonyms = [
    'cordless, battery, battery powered',
    'grinder, angle grinder',
    'pressure washer, jet washer, high pressure cleaner',
    'vacuum, vacuum cleaner, hoover',
    'welding machine, welder, inverter welder',
    'drill machine, drill',
    // Trade words for things that are in the catalogue today.
    'demolition hammer, breaker, jackhammer',
    'rotary hammer, hammer drill',
    'marble cutter, tile cutter, stone cutter',
    'polisher, buffer, sander polisher',
  ]
  for (const terms of synonyms) {
    const existing = await payload.find({
      collection: 'search-synonyms',
      where: { terms: { equals: terms } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs.length === 0) {
      await payload.create({ collection: 'search-synonyms', data: { terms }, ...quiet() })
    }
  }
  log(`${synonyms.length} search synonyms`)

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
