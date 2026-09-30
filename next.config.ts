import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Uploaded images are served from R2's public URL once it is configured.
const r2Host = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null

const nextConfig: NextConfig = {
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
