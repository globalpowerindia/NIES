'use client'

import { useEffect, useState } from 'react'

type Props = {
  bounds: { min: number; max: number }
  value: { min?: number; max?: number }
  /** Called once a drag or edit finishes, with whole rupees. */
  onCommit: (min: number, max: number) => void
}

const format = (rupees: number) => rupees.toLocaleString('en-IN')
const parse = (text: string) => Number(text.replace(/\D/g, '')) || 0

const THUMB =
  'pointer-events-none absolute inset-x-0 top-0 h-[17px] w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-dark-200 [&::-moz-range-thumb]:bg-[radial-gradient(circle,var(--color-dark-100)_5px,var(--color-light-100)_5.5px)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-dark-200 [&::-webkit-slider-thumb]:bg-[radial-gradient(circle,var(--color-dark-100)_5px,var(--color-light-100)_5.5px)] focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-brand-blue-500'

export const PriceRange = ({ bounds, value, onCommit }: Props) => {
  const [min, setMin] = useState(value.min ?? bounds.min)
  const [max, setMax] = useState(value.max ?? bounds.max)

  // A back/forward navigation changes the URL under us; follow it.
  useEffect(() => {
    setMin(value.min ?? bounds.min)
    setMax(value.max ?? bounds.max)
  }, [value.min, value.max, bounds.min, bounds.max])

  const span = bounds.max - bounds.min || 1
  const step = Math.max(1, Math.round(span / 100))
  const percent = (rupees: number) => ((rupees - bounds.min) / span) * 100

  const commit = (nextMin = min, nextMax = max) => {
    const low = Math.max(bounds.min, Math.min(nextMin, nextMax))
    const high = Math.min(bounds.max, Math.max(nextMin, nextMax))
    setMin(low)
    setMax(high)
    if (low !== (value.min ?? bounds.min) || high !== (value.max ?? bounds.max)) onCommit(low, high)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative h-[17px] w-full">
        <div className="absolute inset-x-[9px] top-[5px] h-[7px] rounded-[2px] bg-dark-100" />
        <div
          className="absolute top-[4.5px] h-2 rounded-[2px] bg-brand-red-400"
          style={{
            left: `calc(9px + (100% - 18px) * ${percent(min) / 100})`,
            right: `calc(9px + (100% - 18px) * ${1 - percent(max) / 100})`,
          }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={min}
          onChange={(event) => setMin(Math.min(Number(event.target.value), max))}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          className={THUMB}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={max}
          onChange={(event) => setMax(Math.max(Number(event.target.value), min))}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          className={THUMB}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {(
          [
            ['Min', min, setMin, (typed: number) => commit(typed, max)],
            ['Max', max, setMax, (typed: number) => commit(min, typed)],
          ] as const
        ).map(([label, amount, setAmount, commitTyped]) => (
          <label key={label} className="flex items-center gap-2 text-body3 text-dark-500">
            {label}
            <input
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
          </label>
        ))}
      </div>
    </div>
  )
}
