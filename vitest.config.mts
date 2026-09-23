import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'src/**/*.test.ts'],
    // Integration tests boot Payload against Neon, which pulls the schema over
    // the network and can take the best part of a minute on a cold start.
    // Vitest's 10s default made `test:int` impossible to pass.
    hookTimeout: 120_000,
    testTimeout: 60_000,
    // Each integration file boots Payload, and Payload pushes the schema on
    // boot. Two doing that at once race on the same database and fail with
    // "constraint does not exist". One file at a time.
    fileParallelism: false,
  },
})
