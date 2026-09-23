import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const FONT_SIZES = [
  'title3',
  'h2',
  'h3',
  'h5',
  'h6',
  'body1',
  'body2',
  'body3',
  'label1',
  'label2',
  'caption1',
]

/**
 * Without this, tailwind-merge cannot tell the design system's `text-h2`
 * (a font size) from `text-dark-500` (a colour) — both look like `text-*` — and
 * silently drops one. Registering the scale keeps sizes and colours independent.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
    },
  },
})

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
