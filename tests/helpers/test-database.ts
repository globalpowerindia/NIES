import { readFileSync } from 'node:fs'

import { parse } from 'dotenv'

/**
 * Database tests create, update and delete staff, customers and sign-in codes,
 * so they must never run against the database the app uses. They run only when
 * TEST_DATABASE_URL names a separate, disposable database, and DATABASE_URL is
 * then pointed at it before Payload boots.
 */

const appDatabaseUrls = (): string[] =>
  ['.env', '.env.local']
    .flatMap((file) => {
      try {
        return [parse(readFileSync(file)).DATABASE_URL]
      } catch {
        return []
      }
    })
    .filter((url): url is string => Boolean(url))

/** Host + database name; credentials and query options don't make it a different database. */
const identity = (url: string): string => {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/-pooler(?=\.)/, '')}:${parsed.port}${parsed.pathname}`
  } catch {
    return url
  }
}

export const requireTestDatabase = (): void => {
  const testUrl = process.env.TEST_DATABASE_URL
  if (!testUrl) {
    throw new Error(
      'Database tests need TEST_DATABASE_URL: a separate, disposable Postgres database. ' +
        'They create and delete users, customers and codes, so they refuse to use DATABASE_URL.',
    )
  }
  const live = [...appDatabaseUrls(), process.env.DATABASE_URL].filter((url): url is string => Boolean(url))
  if (live.some((url) => identity(url) === identity(testUrl))) {
    throw new Error('TEST_DATABASE_URL points at the app database. Use a separate, disposable database.')
  }
  process.env.DATABASE_URL = testUrl
}
