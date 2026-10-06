import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'e2e-admin@example.test',
  // Fresh every run, so an account left behind by an interrupted run can't be logged into.
  password: randomBytes(18).toString('base64url'),
  name: 'Dev User',
  role: 'SUPER_ADMIN' as const,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: testUser,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
