'use client'

import { Slider as SliderPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * shadcn/ui's Slider, with the track, filled range and thumbs styleable per
 * use, and a label for each thumb (a two-thumb range needs both named).
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  trackClassName,
  rangeClassName,
  thumbClassName,
  thumbLabels,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackClassName?: string
  rangeClassName?: string
  thumbClassName?: string
  thumbLabels?: string[]
}) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          'relative h-1 w-full grow overflow-hidden rounded-full bg-muted',
          trackClassName,
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn('absolute h-full bg-primary select-none', rangeClassName)}
        />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabels?.[index]}
          className={cn(
            'relative block size-3 shrink-0 rounded-full border border-ring bg-white select-none after:absolute after:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-500 disabled:pointer-events-none disabled:opacity-50',
            thumbClassName,
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
