import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Brands } from './collections/Brands'
import { Categories } from './collections/Categories'
import { AuthIdentities } from './collections/AuthIdentities'
import { AuthTokens } from './collections/AuthTokens'
import { Customers } from './collections/Customers'
import { Datasheets } from './collections/Datasheets'
import { Inventory } from './collections/Inventory'
import { Media } from './collections/Media'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { ProductVariants } from './collections/ProductVariants'
import { Reviews } from './collections/Reviews'
import { SearchSynonyms } from './collections/SearchSynonyms'
import { SpecDefinitions } from './collections/SpecDefinitions'
import { StockMovements } from './collections/StockMovements'
import { Users } from './collections/Users'
import { HomePage } from './globals/HomePage'
import { SiteSettings } from './globals/SiteSettings'
import { env, r2 } from './lib/env'
import { consoleEmailAdapter } from './lib/email-console'
import { enforceIntegerMoney } from './lib/schema-constraints'
import { addSearchVector } from './lib/search-schema'

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
    SearchSynonyms,
    Customers,
    AuthIdentities,
    AuthTokens,
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
    // Every Payload boot otherwise introspects and diffs the whole schema.
    // Under test that runs once per file against a remote database: it took
    // the suite to 33 minutes and Neon started resetting connections
    // mid-introspection. Tests run against the schema dev has already pushed.
    push: process.env.NODE_ENV !== 'test',
    afterSchemaInit: [enforceIntegerMoney, addSearchVector],
  }),
  // Until a real provider is configured (Module 9), print emails so the
  // verification and reset links are usable locally.
  email: consoleEmailAdapter,
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
