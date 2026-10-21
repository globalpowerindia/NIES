import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Uploaded images are served from R2's public URL once it is configured.
const r2Host = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null

// Report-only for now: browsers log what this policy would block without
// blocking it. Once the console stays clean across the storefront and admin,
// rename the header to Content-Security-Policy to enforce it. Next's inline
// bootstrap scripts need 'unsafe-inline' until nonces are wired in.
const r2Origin = r2Host?.origin ?? ''
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://i.ytimg.com https://*.razorpay.com ${r2Origin}`,
  `media-src 'self' blob: ${r2Origin}`,
  // Razorpay's payment window is an iframe from api.razorpay.com.
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com https://api.razorpay.com https://checkout.razorpay.com',
  "connect-src 'self' https://*.r2.cloudflarestorage.com https://api.razorpay.com https://lumberjack.razorpay.com",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy-Report-Only', value: csp },
      // Browsers ignore this over plain http, so it is harmless in development.
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }]
  },
  images: {
    remotePatterns: r2Host
      ? [{ protocol: r2Host.protocol.replace(':', '') as 'https', hostname: r2Host.hostname }]
      : [],
    localPatterns: [
      { pathname: '/api/media/file/**' },
      { pathname: '/banners/**' },
      { pathname: '/products/**' },
      { pathname: '/icons/**' },
      { pathname: '/brand/**' },
      { pathname: '/brands/**' },
      { pathname: '/categories/**' },
      { pathname: '/app-promo/**' },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
