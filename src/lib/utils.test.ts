import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('keeps a design-system font size alongside a text colour', () => {
    expect(cn('text-h2', 'text-dark-500')).toBe('text-h2 text-dark-500')
  })

  it('keeps responsive font sizes alongside responsive colours', () => {
    const result = cn('text-h3 md:text-h2', 'text-light-100 md:text-dark-500')
    expect(result).toContain('md:text-h2')
    expect(result).toContain('md:text-dark-500')
    expect(result).toContain('text-h3')
  })

  it('still collapses two font sizes to the last one', () => {
    expect(cn('text-h3', 'text-h2')).toBe('text-h2')
  })

  it('still collapses two text colours to the last one', () => {
    expect(cn('text-dark-500', 'text-light-100')).toBe('text-light-100')
  })
})
