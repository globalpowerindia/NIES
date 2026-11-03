import { describe, expect, it } from 'vitest'

import { amountInWords } from '@/lib/amount-in-words'

describe('amountInWords', () => {
  it('writes small amounts', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only')
    expect(amountInWords(100)).toBe('Rupees One Only')
    expect(amountInWords(1900)).toBe('Rupees Nineteen Only')
    expect(amountInWords(4_500)).toBe('Rupees Forty-Five Only')
    expect(amountInWords(70_000)).toBe('Rupees Seven Hundred Only')
  })

  it('groups in thousands, lakhs and crores', () => {
    expect(amountInWords(1_249_900)).toBe('Rupees Twelve Thousand Four Hundred Ninety-Nine Only')
    expect(amountInWords(10_000_000)).toBe('Rupees One Lakh Only')
    expect(amountInWords(12_499_950)).toBe('Rupees One Lakh Twenty-Four Thousand Nine Hundred Ninety-Nine and Fifty Paise Only')
    expect(amountInWords(1_000_000_000)).toBe('Rupees One Crore Only')
    expect(amountInWords(100_000_000_000)).toBe('Rupees One Hundred Crore Only')
  })

  it('adds paise', () => {
    expect(amountInWords(1)).toBe('Rupees Zero and One Paise Only')
    expect(amountInWords(10_005)).toBe('Rupees One Hundred and Five Paise Only')
  })

  it('refuses amounts that are not whole paise', () => {
    expect(() => amountInWords(1.5)).toThrow()
    expect(() => amountInWords(-100)).toThrow()
  })
})
