import { sql } from 'drizzle-orm'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

export type TransactionDB = {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }>
}

/** Never silently fall back to an unrelated connection for an atomic operation. */
export const transactionDB = async (req: PayloadRequest): Promise<TransactionDB> => {
  const id = await req.transactionID
  const adapter = req.payload.db as unknown as { sessions: Record<string, { db: TransactionDB }> }
  const db = id == null ? undefined : adapter.sessions[String(id)]?.db
  if (!db) throw new Error('An active database transaction is required.')
  return db
}

export const inTransaction = async <T>(
  payload: Payload,
  lockKeys: string[],
  run: (req: PayloadRequest) => Promise<T>,
): Promise<T> => {
  const transactionID = await payload.db.beginTransaction()
  if (transactionID == null) throw new Error('Database transactions are required.')
  const req = await createLocalReq({ req: { transactionID } }, payload)
  try {
    const db = await transactionDB(req)
    for (const key of [...new Set(lockKeys)].sort()) {
      await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`)
    }
    const result = await run(req)
    await payload.db.commitTransaction(transactionID)
    return result
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
