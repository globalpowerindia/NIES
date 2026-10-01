'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * shadcn/ui's Toaster. The storefront has no dark theme, so it is always
 * light; toasts that need the design's own look render with `toast.custom`.
 */
const Toaster = (props: ToasterProps) => (
  <Sonner theme="light" className="toaster group" {...props} />
)

export { Toaster }
