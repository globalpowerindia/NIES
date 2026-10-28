'use client'

import * as Sentry from '@sentry/nextjs'
import { TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

import { StatusPage } from '@/components/layout/StatusPage'
import { Button, ButtonLink } from '@/components/ui/button'

/**
 * A storefront page threw. The layout above keeps rendering, so the header,
 * cart and footer stay usable. Production hides the server's message; the
 * digest is what matches this to the server log.
 */
export default function StorefrontError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null

  return (
    <StatusPage
      icon={<TriangleAlert className="size-10" strokeWidth={1.25} aria-hidden />}
      title="Something went wrong"
      actions={
        <>
          <Button variant="blue" className="h-12.5 w-58" onClick={() => retry()}>
            Try again
          </Button>
          <ButtonLink href="/" variant="outline" className="h-12.5 w-58">
            Go to Home
          </ButtonLink>
        </>
      }
    >
      We couldn’t load this page. Please try again in a moment. Your cart is safe.
      {digest && <span className="mt-2 block text-body3 text-dark-200">Reference: {digest}</span>}
    </StatusPage>
  )
}
