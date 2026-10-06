'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

type Props = {
  bounds: { min: number; max: number }
  value: { min?: number; max?: number }
  /** Called once a drag or edit finishes, with whole rupees. */
  onCommit: (min: number, max: number) => void
}

const format = (rupees: number) => rupees.toLocaleString('en-IN')
const parse = (text: string) => Number(text.replace(/\D/g, '')) || 0

export const PriceRange = ({ bounds, value, onCommit }: Props) => {
  const [min, setMin] = useState(value.min ?? bounds.min)
  const [max, setMax] = useState(value.max ?? bounds.max)

  // A back/forward navigation changes the URL under us; follow it (adjusting
  // state during render, which React prefers over an effect for this).
  const incoming = `${value.min ?? bounds.min}-${value.max ?? bounds.max}`
  const [followed, setFollowed] = useState(incoming)
  if (followed !== incoming) {
    setFollowed(incoming)
    setMin(value.min ?? bounds.min)
    setMax(value.max ?? bounds.max)
  }

  const span = bounds.max - bounds.min || 1
  const step = Math.max(1, Math.round(span / 100))

  const commit = (nextMin = min, nextMax = max) => {
    const low = Math.min(bounds.max, Math.max(bounds.min, Math.min(nextMin, nextMax)))
    const high = Math.max(bounds.min, Math.min(bounds.max, Math.max(nextMin, nextMax)))
    setMin(low)
    setMax(high)
    if (low !== (value.min ?? bounds.min) || high !== (value.max ?? bounds.max)) onCommit(low, high)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* The Figma track: 7px, grey, with the chosen span in red, between 18px thumbs. */}
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={step}
        minStepsBetweenThumbs={0}
        value={[min, max]}
        onValueChange={([low, high]) => {
          setMin(low)
          setMax(high)
        }}
        onValueCommit={([low, high]) => commit(low, high)}
        thumbLabels={['Minimum price', 'Maximum price']}
        className="h-[17px]"
        trackClassName="mx-[9px] h-[7px] overflow-visible rounded-[2px] bg-dark-100"
        rangeClassName="-top-[0.5px] h-2 rounded-[2px] bg-brand-red-400"
        thumbClassName="size-[18px] cursor-grab border-dark-200 bg-[radial-gradient(circle,var(--color-dark-100)_5px,var(--color-light-100)_5.5px)] active:cursor-grabbing"
      />

      <div className="flex items-center justify-between gap-2">
        {(
          [
            ['Min', min, setMin, (typed: number) => commit(typed, max)],
            ['Max', max, setMax, (typed: number) => commit(min, typed)],
          ] as const
        ).map(([label, amount, setAmount, commitTyped]) => (
          <Label key={label} className="flex items-center gap-2 text-body3 text-dark-500">
            {label}
            <Input
              inputMode="numeric"
              aria-label={`${label}imum price in rupees`}
              value={format(amount)}
              onChange={(event) => setAmount(parse(event.target.value))}
              onBlur={(event) => commitTyped(parse(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitTyped(parse(event.currentTarget.value))
              }}
              className="h-10 w-[88px] rounded-[2px] border-[0.5px] border-neutral-600 bg-light-100 text-center text-body3 text-dark-500 focus:border-brand-blue-500 focus:outline-none"
            />
          </Label>
        ))}
      </div>
    </div>
  )
}
