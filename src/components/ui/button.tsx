import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * shadcn/ui's Button, wearing the Figma variants: red and blue fills, the
 * outlined secondary, and a ghost for icon-only actions.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2.5 rounded-xl font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        red: 'bg-brand-red-400 text-light-100 hover:bg-brand-red-500 focus-visible:outline-brand-red-500',
        blue: 'bg-brand-blue-500 text-light-100 hover:bg-brand-blue-600 focus-visible:outline-brand-blue-500',
        outline:
          'border border-brand-blue-200 bg-light-100 text-dark-500 hover:bg-brand-blue-100 focus-visible:outline-brand-blue-500',
        ghost: 'text-dark-500 hover:bg-neutral-200 focus-visible:outline-brand-blue-500',
      },
      size: {
        default: 'h-10 px-6 py-2 text-body2',
        tall: 'h-13 px-6 text-body2',
        icon: 'size-10 px-0',
      },
    },
    defaultVariants: { variant: 'red', size: 'default' },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

/** `asChild` styles a child element (a link, say) as the button instead of rendering a `<button>`. */
export const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & ButtonVariants & { asChild?: boolean }) => {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/** A Next.js link that looks like a button. */
export const ButtonLink = ({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof Link> & ButtonVariants) => (
  <Button asChild variant={variant} size={size} className={className}>
    <Link {...props} />
  </Button>
)

export { buttonVariants }
