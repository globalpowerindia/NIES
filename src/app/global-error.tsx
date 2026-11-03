'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * The last resort, when a root layout itself fails (the site settings could
 * not load, say). It replaces the whole document, so nothing from the
 * storefront's styles or header is available: plain inline styles only.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f4f5f9', color: '#1c1c1c' }}>
        <title>Something went wrong</title>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '96px 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: '#55575e', margin: '0 0 28px' }}>
            The site couldn’t load just now. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: '#293681', color: '#fff', border: 0, borderRadius: 12, padding: '14px 32px', fontSize: 16, cursor: 'pointer' }}
          >
            Try again
          </button>
          {digest && <p style={{ fontSize: 12, color: '#8a8c93', marginTop: 24 }}>Reference: {digest}</p>}
        </main>
      </body>
    </html>
  )
}
