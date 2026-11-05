/** How many products fit side by side and stay readable. */
export const COMPARE_MAX = 4

/** Product ids from a link or request: positive whole numbers, no repeats, at most `COMPARE_MAX`. */
export const parseCompareIds = (raw: string | null | undefined): number[] => {
  const ids = (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
  return [...new Set(ids)].slice(0, COMPARE_MAX)
}

export const compareLink = (ids: number[]) => `/compare?products=${ids.join(',')}`

const normal = (value: string | undefined) => (value ?? '—').trim().toLowerCase()

/** Whether a row tells the products apart. A missing value counts as different from a present one. */
export const valuesDiffer = (values: (string | undefined)[]): boolean =>
  new Set(values.map(normal)).size > 1
