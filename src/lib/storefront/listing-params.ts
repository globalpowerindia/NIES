/** Listing URL parsing. Imported by client components, so it must stay free of server code. */

export const SORTS = {
  /** Search only: the order `searchProducts` returned. Offered nowhere else. */
  relevance: 'Relevance',
  popularity: 'Popularity',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Customer Rating',
} as const

export type SortKey = keyof typeof SORTS

/** Page sizes a shopper can pick; the first is the default and needs no `?perPage=`. */
export const PER_PAGE_OPTIONS = [20, 40, 60] as const
export const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0]

/**
 * Everything a listing URL can say. Prices are whole rupees in the URL so links
 * read naturally (`?max=5000`); they become paise only at comparison time.
 */
export type ListingParams = {
  sub: string[]
  brands: string[]
  minRupees?: number
  maxRupees?: number
  inStock: boolean
  specs: Record<string, string[]>
  sort: SortKey
  page: number
  perPage: number
}

export type RawParams = Record<string, string | string[] | undefined>

const listOf = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)

/**
 * Spec values are free text and can hold commas ("Electric, 220V single
 * phase"), so each value is its own repeated param (`spec.x=a&spec.x=b`)
 * rather than a comma-joined list.
 */
const valuesOf = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value ? [value] : []).map((entry) => entry.trim()).filter(Boolean)

const wholeNumber = (value: string | string[] | undefined): number | undefined => {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined
}

export const parseListingParams = (raw: RawParams, defaultSort: SortKey = 'popularity'): ListingParams => {
  const sort = typeof raw.sort === 'string' && raw.sort in SORTS ? (raw.sort as SortKey) : defaultSort
  const specs: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('spec.')) {
      const values = valuesOf(value)
      if (values.length) specs[key.slice(5)] = values
    }
  }
  return {
    sub: listOf(raw.sub),
    brands: listOf(raw.brand),
    minRupees: wholeNumber(raw.min),
    maxRupees: wholeNumber(raw.max),
    inStock: raw.stock === '1',
    specs,
    sort,
    page: Math.max(1, wholeNumber(raw.page) ?? 1),
    perPage: perPageOf(raw.perPage),
  }
}

const perPageOf = (value: string | string[] | undefined): number => {
  const parsed = wholeNumber(value)
  return PER_PAGE_OPTIONS.find((option) => option === parsed) ?? DEFAULT_PER_PAGE
}

/** A URLSearchParams as the record `parseListingParams` reads, repeated keys becoming arrays. */
export const rawParamsOf = (params: URLSearchParams): RawParams => {
  const raw: Record<string, string | string[]> = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    raw[key] = values.length > 1 ? values : values[0]
  }
  return raw
}

/** Rebuilds a query string from the raw params with one key changed, e.g. for pagination links. */
export const withParam = (raw: RawParams, key: string, value: string | null): string => {
  const params = new URLSearchParams()
  for (const [name, entry] of Object.entries(raw)) {
    if (name === key || entry === undefined) continue
    for (const single of Array.isArray(entry) ? entry : [entry]) params.append(name, single)
  }
  if (value !== null) params.set(key, value)
  const query = params.toString()
  return query ? `?${query}` : ''
}
