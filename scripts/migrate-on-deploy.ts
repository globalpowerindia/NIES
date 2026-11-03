/**
 * Applies pending migrations before a production build, so new code never
 * meets an old schema. Vercel runs it through `vercel-build`.
 *
 * Why not Payload's `prodMigrations`: that runs on every cold start with no
 * lock, so two instances booting at once can both apply the same migration.
 * A build runs once per deploy.
 *
 * Preview builds are skipped: they may share the production database, and a
 * branch's migration must not reach it before the branch is merged. Set
 * MIGRATE_ON_DEPLOY=true for previews that have their own database.
 */

export {}

const vercelEnv = process.env.VERCEL_ENV
if (vercelEnv && vercelEnv !== 'production' && process.env.MIGRATE_ON_DEPLOY !== 'true') {
  console.log(`[migrate] skipped on a ${vercelEnv} build (set MIGRATE_ON_DEPLOY=true to run it)`)
  process.exit(0)
}

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')

const payload = await getPayload({ config })

// A schema push from `next dev` leaves a batch -1 row. Payload would then ask
// in a prompt whether to continue, which a build can't answer, and it would
// exit quietly with nothing applied. Fail loudly instead.
const pushed = await payload.count({ collection: 'payload-migrations', where: { batch: { equals: -1 } } }).catch(() => null)
if (pushed && pushed.totalDocs > 0) {
  console.error('[migrate] this database has a dev schema push recorded (batch -1). Migrations would not run safely; stopping the deploy.')
  process.exit(1)
}

await payload.db.migrate()
console.log('[migrate] up to date')
process.exit(0)
