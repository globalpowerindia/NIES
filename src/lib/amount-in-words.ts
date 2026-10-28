/**
 * An amount in words, Indian style, as a GST invoice states its total:
 * 1,24,999.50 → "Rupees One Lakh Twenty-Four Thousand Nine Hundred
 * Ninety-Nine and Fifty Paise Only". Lakh and crore, not million.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

/** 0–99 */
const twoDigits = (n: number): string =>
  n < 20 ? ONES[n] : n % 10 ? `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}` : TENS[Math.floor(n / 10)]

/** 0–999 */
const threeDigits = (n: number): string => {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ')
}

/** A whole number of rupees in words; crores repeat, so 100 crore is "One Hundred Crore". */
const wholeInWords = (n: number): string => {
  if (n === 0) return 'Zero'
  const crore = Math.floor(n / 10_000_000)
  const lakh = Math.floor((n % 10_000_000) / 100_000)
  const thousand = Math.floor((n % 100_000) / 1000)
  const rest = n % 1000
  return [
    crore ? `${wholeInWords(crore)} Crore` : '',
    lakh ? `${twoDigits(lakh)} Lakh` : '',
    thousand ? `${twoDigits(thousand)} Thousand` : '',
    rest ? threeDigits(rest) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export const amountInWords = (paise: number): string => {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new Error('amountInWords takes a non-negative whole number of paise')
  const rupees = Math.floor(paise / 100)
  const rest = paise % 100
  return `Rupees ${wholeInWords(rupees)}${rest ? ` and ${twoDigits(rest)} Paise` : ''} Only`
}
