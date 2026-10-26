import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // `server-only` throws unless bundled for the server by Next. Tests are server code too.
    alias: { 'server-only': fileURLToPath(new URL('./tests/helpers/empty-module.ts', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          // Unit tests never connect, but some import modules that validate
          // the environment on load; CI has no .env.
          env: { DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://unit-tests-do-not-connect@invalid/none' },
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'int',
          environment: 'node',
          // tests/int/setup.ts refuses to run unless TEST_DATABASE_URL names a
          // separate database: these tests create and delete real rows.
          setupFiles: ['./vitest.setup.ts', './tests/int/setup.ts'],
          include: ['tests/int/**/*.int.spec.ts'],
          // Integration tests boot Payload over the network, which can take the
          // best part of a minute on a cold start. Vitest's 10s default made
          // `test:int` impossible to pass.
          hookTimeout: 120_000,
          testTimeout: 60_000,
          // Each integration file boots Payload against the same database.
          // One file at a time.
          fileParallelism: false,
        },
      },
    ],
  },
})
