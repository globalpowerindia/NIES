/**
 * Keeps the demo seeds off the live shop. A seed runs against whatever
 * DATABASE_URL is in .env, and the development database is remote too, so
 * the host alone can't tell them apart. What does: an env file pulled from
 * production carries NODE_ENV/VERCEL_ENV=production or the real site URL.
 *
 * Called before Payload connects, so a refused run touches nothing.
 */

const OVERRIDE_FLAG = '--i-know-this-is-production'

const productionSignal = (): string | null => {
  if (process.env.NODE_ENV === 'production') return 'NODE_ENV is production'
  if (process.env.VERCEL_ENV === 'production') return 'VERCEL_ENV is production'
  const site = process.env.NEXT_PUBLIC_SITE_URL
  if (site) {
    const host = new URL(site).hostname
    if (host !== 'localhost' && host !== '127.0.0.1') return `NEXT_PUBLIC_SITE_URL is ${site}`
  }
  return null
}

const databaseHost = (): string => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').hostname || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Exits unless this looks like a development environment.
 *
 * `overridable`: whether `--i-know-this-is-production` may run it anyway.
 * Off for seeds whose data must never reach the live shop at all.
 */
export const refuseOnProduction = (seed: string, { overridable }: { overridable: boolean }): void => {
  const signal = productionSignal()
  if (!signal) return
  if (overridable && process.argv.includes(OVERRIDE_FLAG)) {
    console.warn(`[${seed}] running against ${databaseHost()} although ${signal} (${OVERRIDE_FLAG})`)
    return
  }
  console.error(
    [
      `[${seed}] refused: this looks like production (${signal}; database ${databaseHost()}).`,
      overridable
        ? `If that is really intended, run it again with ${OVERRIDE_FLAG}.`
        : 'This seed writes demo data and never runs against production.',
    ].join('\n'),
  )
  process.exit(1)
}
