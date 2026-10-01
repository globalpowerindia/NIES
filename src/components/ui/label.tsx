'use client'

import { Label as LabelPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/** shadcn/ui's Label. Type and colour come from each use, as in the Figma frames. */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
