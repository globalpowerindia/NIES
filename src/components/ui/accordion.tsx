'use client'

import { ChevronDownIcon } from 'lucide-react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * shadcn/ui's Accordion, adapted to the Figma frames: one chevron that turns
 * as the section opens, no hover underline, and no built-in borders or
 * padding, since each use (filters, product details) sets its own.
 */
function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={className} {...props} />
}

function AccordionTrigger({
  className,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { iconClassName?: string }) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex flex-1 cursor-pointer items-center justify-between text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500 disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          strokeWidth={1.5}
          className={cn(
            'pointer-events-none size-6 shrink-0 transition-transform group-data-[state=open]/accordion-trigger:rotate-180',
            iconClassName,
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div className={className}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
