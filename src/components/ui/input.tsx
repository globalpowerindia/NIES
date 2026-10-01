import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * shadcn/ui's Input. The storefront has two input looks (the sign-in fields
 * and the account pages' value boxes), so the base carries behaviour and
 * states only, and each use brings its Figma styling.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 bg-transparent outline-none transition-colors disabled:cursor-not-allowed aria-invalid:border-brand-red-400',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
