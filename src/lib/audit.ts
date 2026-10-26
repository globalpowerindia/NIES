import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  GlobalConfig,
  Payload,
  PayloadRequest,
} from 'payload'

import { clientIp } from '@/lib/request-ip'

/**
 * The staff audit trail: who changed what in the admin, when, from where, and
 * what each field was before and after. Rows go to `audit-logs`, which nobody
 * can edit or delete, so the trail can't be tidied after the fact.
 *
 * Only staff writes are recorded (`req.user` from the `users` collection).
 * Checkout, sign-in and scripts have no staff user; they keep their own
 * records (orders, the stock ledger, sessions).
 */

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'PASSWORD_RESET_REQUESTED'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/** Never copied into the log, even as "before" and "after". */
const SECRET_FIELDS = new Set([
  'password',
  'hash',
  'salt',
  'sessions',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'resetPasswordRequestedAt',
  'loginAttempts',
  'lockUntil',
  'apiKey',
  'apiKeyIndex',
  'codeHash',
])

/** Changes on every save, or derived from other fields: noise in a diff. */
const NOISE_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'searchA', 'searchB', 'searchC', 'sizes', 'url', 'thumbnailURL'])

/** Long values (rich text, order items) are cut to this, so one save can't write a huge row. */
const MAX_VALUE_CHARS = 500

/** A populated relationship becomes its id, so depth doesn't make an unchanged field look changed. */
const normalise = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalise)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.id === 'number' && 'createdAt' in record) return record.id
    return Object.fromEntries(Object.entries(record).map(([key, inner]) => [key, normalise(inner)]))
  }
  return value
}

const shown = (value: unknown): unknown => {
  const json = JSON.stringify(value ?? null)
  return json.length > MAX_VALUE_CHARS ? `${json.slice(0, MAX_VALUE_CHARS)}…` : (value ?? null)
}

/** Field by field, what changed between two versions of a document. */
export const diffDocuments = (
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): Record<string, { from: unknown; to: unknown }> => {
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
    if (SECRET_FIELDS.has(key) || NOISE_FIELDS.has(key)) continue
    const from = normalise(before?.[key])
    const to = normalise(after?.[key])
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) changes[key] = { from: shown(from), to: shown(to) }
  }
  return changes
}

const staffOf = (req: PayloadRequest) =>
  req.user?.collection === 'users' ? (req.user as { id: number; email?: string | null }) : null

export type AuditEntry = {
  action: AuditAction
  entity?: string
  documentId?: string | number
  documentTitle?: string | null
  changes?: Record<string, unknown> | null
  /** Who, when nobody is signed in yet (a failed login or reset request). */
  email?: string | null
  /**
   * The staff user, when the request doesn't carry them yet (a sign-in). The
   * request itself is passed as it is: a copy (`{ ...req }`) loses its
   * headers, and with them the IP and browser.
   */
  staff?: { id: number; email?: string | null }
}

/**
 * Writes one row, by default inside the request's transaction so it commits
 * or rolls back with the change it records. A failed sign-in passes
 * `inTransaction: false`: its request is failing, and the row must outlive it.
 */
export const writeAudit = async (payload: Payload, request: PayloadRequest, entry: AuditEntry, inTransaction = true) => {
  const staff = entry.staff ?? staffOf(request)
  await payload.create({
    collection: 'audit-logs',
    data: {
      action: entry.action,
      user: staff?.id ?? null,
      userEmail: staff?.email ?? entry.email ?? null,
      entity: entry.entity ?? null,
      documentId: entry.documentId === undefined ? null : String(entry.documentId),
      documentTitle: entry.documentTitle ?? null,
      changes: entry.changes ?? null,
      ip: request.headers ? clientIp({ headers: request.headers }) : null,
      userAgent: request.headers?.get('user-agent')?.slice(0, 300) ?? null,
    },
    overrideAccess: true,
    ...(inTransaction ? { req: request } : {}),
  })
}

const titleOf = (doc: Record<string, unknown>, useAsTitle: string | undefined) => {
  const title = useAsTitle ? doc[useAsTitle] : undefined
  return typeof title === 'string' || typeof title === 'number' ? String(title) : null
}

/**
 * Payload hashes a new password and deletes it from `data` before the
 * afterChange hooks run, so it's noticed here and recorded there.
 */
const passwordKey = (slug: string, id: unknown) => `audit:password:${slug}:${id ?? 'new'}`

const notePassword: CollectionBeforeChangeHook = ({ collection, data, originalDoc, req }) => {
  if (collection.auth && typeof data?.password === 'string' && data.password) req.context[passwordKey(collection.slug, originalDoc?.id)] = true
  return data
}

const auditChange: CollectionAfterChangeHook = async ({ collection, doc, operation, previousDoc, req }) => {
  if (!staffOf(req)) return doc
  const changes = diffDocuments(operation === 'create' ? undefined : previousDoc, doc)
  // A password is recorded as changed, never as a value.
  const key = passwordKey(collection.slug, operation === 'create' ? undefined : previousDoc?.id)
  if (req.context[key]) {
    delete req.context[key]
    changes.password = { from: '(hidden)', to: '(changed)' }
  }
  if (operation === 'update' && Object.keys(changes).length === 0) return doc
  await writeAudit(req.payload, req, {
    action: operation === 'create' ? 'CREATE' : 'UPDATE',
    entity: collection.slug,
    documentId: doc.id,
    documentTitle: titleOf(doc, collection.admin?.useAsTitle),
    changes,
  })
  return doc
}

const auditDelete: CollectionAfterDeleteHook = async ({ collection, doc, id, req }) => {
  if (!staffOf(req)) return doc
  await writeAudit(req.payload, req, {
    action: 'DELETE',
    entity: collection.slug,
    documentId: id,
    documentTitle: titleOf(doc, collection.admin?.useAsTitle),
    changes: diffDocuments(doc, undefined),
  })
  return doc
}

const auditGlobal: GlobalAfterChangeHook = async ({ doc, global, previousDoc, req }) => {
  if (!staffOf(req)) return doc
  const changes = diffDocuments(previousDoc, doc)
  if (Object.keys(changes).length === 0) return doc
  await writeAudit(req.payload, req, { action: 'UPDATE', entity: `global:${global.slug}`, documentTitle: global.label ? String(global.label) : global.slug, changes })
  return doc
}

/** Records every staff create, update and delete on this collection. */
export const withAudit = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  hooks: {
    ...collection.hooks,
    beforeChange: [...(collection.hooks?.beforeChange ?? []), notePassword],
    afterChange: [...(collection.hooks?.afterChange ?? []), auditChange],
    afterDelete: [...(collection.hooks?.afterDelete ?? []), auditDelete],
  },
})

/** Records every staff save of this global. */
export const withGlobalAudit = (global: GlobalConfig): GlobalConfig => ({
  ...global,
  hooks: { ...global.hooks, afterChange: [...(global.hooks?.afterChange ?? []), auditGlobal] },
})
