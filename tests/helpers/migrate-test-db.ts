import { requireTestDatabase } from './test-database'

// Builds the schema in the disposable test database from src/migrations.
requireTestDatabase()

const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')

const payload = await getPayload({ config })
await payload.db.migrate()
process.exit(0)
