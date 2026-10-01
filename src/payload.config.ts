import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Brands } from './collections/Brands'
import { CartItems } from './collections/CartItems'
import { Carts } from './collections/Carts'
import { Categories } from './collections/Categories'
import { CouponRedemptions } from './collections/CouponRedemptions'
import { Coupons } from './collections/Coupons'
import { AuthIdentities } from './collections/AuthIdentities'
import { OtpChallenges } from './collections/OtpChallenges'
import { Addresses } from './collections/Addresses'
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
import { WishlistItems } from './collections/WishlistItems'
import { HomePage } from './globals/HomePage'
import { SiteSettings } from './globals/SiteSettings'
import { env, r2 } from './lib/env'
import { consoleEmailAdapter } from './lib/email-console'
import { enforceIntegerMoney } from './lib/schema-constraints'
import { addSearchVector } from './lib/search-schema'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Product images and datasheets are public, so browsers fetch them straight
 * from R2's public URL instead of streaming every file through our server.
 * Without a public URL they fall back to Payload's /api/<collection>/file route.
 */
const r2PublicUrl = r2?.publicUrl?.replace(/\/$/, '')
const r2Files = {
  // An explicit (empty) prefix keeps the `prefix` column the plugin adds while
  // R2 is off; without it, switching R2 on would make schema push drop it.
  prefix: '',
  ...(r2PublicUrl && {
    disablePayloadAccessControl: true as const,
    generateFileURL: ({ filename, prefix }: { filename: string; prefix?: string }) =>
      `${r2PublicUrl}/${prefix ? `${prefix}/` : ''}${filename}`,
  }),
}

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
    Carts,
    CartItems,
    Coupons,
    CouponRedemptions,
    NewsletterSubscribers,
    SearchSynonyms,
    Customers,
    Addresses,
    WishlistItems,
    AuthIdentities,
    OtpChallenges,
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
      // Large files (videos, big photos) can't pass through a Vercel function,
      // so once R2's CORS allows it the browser uploads them directly.
      clientUploads: env.R2_CLIENT_UPLOADS === 'true',
      collections: { media: r2Files, datasheets: r2Files },
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
