import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
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
import { CustomerSessions } from './collections/CustomerSessions'
import { OtpChallenges } from './collections/OtpChallenges'
import { Addresses } from './collections/Addresses'
import { AuditLogs } from './collections/AuditLogs'
import { Customers } from './collections/Customers'
import { Datasheets } from './collections/Datasheets'
import { Inventory } from './collections/Inventory'
import { Media } from './collections/Media'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Orders } from './collections/Orders'
import { Pages } from './collections/Pages'
import { Products } from './collections/Products'
import { ProductVariants } from './collections/ProductVariants'
import { Reviews } from './collections/Reviews'
import { SearchSynonyms } from './collections/SearchSynonyms'
import { SpecDefinitions } from './collections/SpecDefinitions'
import { StockMovements } from './collections/StockMovements'
import { Users } from './collections/Users'
import { WishlistItems } from './collections/WishlistItems'
import { HomePage } from './globals/HomePage'
import { CheckoutSettings } from './globals/CheckoutSettings'
import { SiteSettings } from './globals/SiteSettings'
import { env, r2 } from './lib/env'
import { activeStaffRole } from './access/roles'
import { withAudit, withGlobalAudit } from './lib/audit'
import { siteUrl } from './lib/site-url'
import { addDocumentCountersTable } from './lib/document-numbers'
import { consoleEmailAdapter } from './lib/email-console'
import { enforceCommerceInvariants } from './lib/commerce-constraints'
import { addRateLimitTable } from './lib/rate-limit'
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
  serverURL: siteUrl(),
  csrf: [siteUrl()],
  upload: { limits: { fileSize: 25 * 1024 * 1024 }, abortOnLimit: true },
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
  // Every collection but the log itself records staff changes; see src/lib/audit.ts.
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
    CustomerSessions,
    Pages,
    Users,
  ].map(withAudit).concat(AuditLogs),
  globals: [HomePage, SiteSettings, CheckoutSettings].map(withGlobalAudit),
  onInit: async (payload) => {
    // A server's own disk doesn't survive a redeploy, and files on it are served from this origin.
    if (process.env.NODE_ENV === 'production' && !r2PublicUrl) {
      payload.logger.warn('R2 is not configured: uploads are stored on local disk and served from this site. Set R2_* and R2_PUBLIC_URL.')
    }
  },
  // The admin and the storefront use REST only; an unused GraphQL API is attack surface for nothing.
  graphQL: { disable: true },
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
    push: process.env.ALLOW_SCHEMA_PUSH === 'true' && process.env.NODE_ENV === 'development',
    afterSchemaInit: [
      enforceIntegerMoney,
      enforceCommerceInvariants,
      addSearchVector,
      addRateLimitTable,
      addDocumentCountersTable,
    ],
  }),
  // Resend once its key is set; until then emails print to the terminal in
  // development (and refuse to send in production).
  email: env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: env.RESEND_API_KEY,
        defaultFromAddress: env.EMAIL_FROM_ADDRESS ?? 'orders@toolshypermarket.com',
        defaultFromName: env.EMAIL_FROM_NAME ?? 'Tools Hypermarket',
      })
    : consoleEmailAdapter,
  sharp,
  plugins: [
    s3Storage({
      enabled: Boolean(r2),
      alwaysInsertFields: true,
      // Large files (videos, big photos) can't pass through a Vercel function,
      // so once R2's CORS allows it the browser uploads them directly.
      clientUploads: env.R2_CLIENT_UPLOADS === 'true' ? { access: ({ req }) => Boolean(activeStaffRole(req.user)) } : false,
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
