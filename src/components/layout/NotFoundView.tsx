import { SearchX } from 'lucide-react'

import { StatusPage } from '@/components/layout/StatusPage'
import { ButtonLink } from '@/components/ui/button'

/** One 404 for a missing product, category or page and for a URL no route matches. */
export const NotFoundView = () => (
  <StatusPage
    icon={<SearchX className="size-10" strokeWidth={1.25} aria-hidden />}
    title="Page not found"
    actions={
      <>
        <ButtonLink href="/products" variant="blue" className="h-12.5 w-58">
          Browse Products
        </ButtonLink>
        <ButtonLink href="/" variant="outline" className="h-12.5 w-58">
          Go to Home
        </ButtonLink>
      </>
    }
  >
    This page may have moved, or the product is no longer listed. Try searching above for the product name or model
    number.
  </StatusPage>
)
