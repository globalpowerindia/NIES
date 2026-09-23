import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Brands } from './collections/Brands'
import { Categories } from './collections/Categories'
import { Datasheets } from './collections/Datasheets'
import { Inventory } from './collections/Inventory'
import { Media } from './collections/Media'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { ProductVariants } from './collections/ProductVariants'
import { Reviews } from './collections/Reviews'
import { SpecDefinitions } from './collections/SpecDefinitions'
import { StockMovements } from './collections/StockMovements'
import { Users } from './collections/Users'
import { HomePage } from './globals/HomePage'
import { SiteSettings } from './globals/SiteSettings'
import { env, r2 } from './lib/env'
import { enforceIntegerMoney } from './lib/schema-constraints'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Global Power',
      description: 'Global Power India commerce administration',
    },
    components: {
      Nav: '/admin/components/Nav#Nav',
      graphics: {
        Logo: '/admin/components/Logo#Logo',
        Icon: '/admin/components/Icon#Icon',
      },
    },
  },
  collections: [
    Categories,
    Brands,
    SpecDefinitions,
    Products,
    ProductVariants,
    Reviews,
    Inventory,
    StockMovements,
    Media,
    Datasheets,
    Orders,
    NewsletterSubscribers,
    Users,
  ],
  globals: [HomePage, SiteSettings],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
    afterSchemaInit: [enforceIntegerMoney],
  }),
  sharp,
  plugins: [
    s3Storage({
      enabled: Boolean(r2),
      alwaysInsertFields: true,
      collections: { media: true, datasheets: true },
      bucket: r2?.bucket ?? '',
      config: {
        region: 'auto',
        endpoint: r2?.endpoint,
        credentials: {
          accessKeyId: r2?.accessKeyId ?? '',
          secretAccessKey: r2?.secretAccessKey ?? '',
        },
      },
    }),
  ],
})
