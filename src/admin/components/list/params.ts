import type { Where } from 'payload'

const PER_PAGE = 25

export type ListParams = {
  view: string
  q: string
  page: number
  limit: number
}

const first = (value: unknown): string =>
  typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : ''

export const readListParams = (searchParams: unknown): ListParams => {
  const sp = (searchParams ?? {}) as Record<string, unknown>
  const page = Number.parseInt(first(sp.page), 10)
  return {
    view: first(sp.view) || 'all',
    q: first(sp.q).trim(),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: PER_PAGE,
  }
}

/** Builds a case-insensitive OR across the given fields. */
export const searchWhere = (q: string, fields: string[]): Where | undefined =>
  q ? { or: fields.map((field) => ({ [field]: { like: q } })) } : undefined

export const combineWhere = (...clauses: (Where | undefined)[]): Where | undefined => {
  const and = clauses.filter((clause): clause is Where => Boolean(clause))
  if (and.length === 0) return undefined
  if (and.length === 1) return and[0]
  return { and }
}
