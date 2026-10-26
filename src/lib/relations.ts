/**
 * The id behind a Payload relationship value, which is a bare id at depth 0
 * and the populated document at depth 1 or more. Dependency-free, so admin
 * client components, collection configs and storefront code can all use it.
 */
export const relId = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null | undefined)?.id

/** Every id in a hasMany relationship value. */
export const relIds = (values: unknown): number[] =>
  Array.isArray(values) ? values.map(relId).filter((id): id is number => id !== undefined) : []
