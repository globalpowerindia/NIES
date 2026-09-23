import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2.5 rounded-xl font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        red: 'bg-brand-red-400 text-light-100 hover:bg-brand-red-500 focus-visible:outline-brand-red-500',
        blue: 'bg-brand-blue-500 text-light-100 hover:bg-brand-blue-600 focus-visible:outline-brand-blue-500',
        outline:
          'border border-brand-blue-200 bg-light-100 text-dark-500 hover:bg-brand-blue-100 focus-visible:outline-brand-blue-500',
        ghost: 'text-dark-500 hover:bg-neutral-200',
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

export const Button = ({
  className,
  variant,
  size,
  ...props
}: ComponentProps<'button'> & ButtonVariants) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
)

export const ButtonLink = ({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof Link> & ButtonVariants) => (
  <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
)

export { buttonVariants }
