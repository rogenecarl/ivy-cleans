import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The component-render suite (tests/render-city.test.tsx) imports components
  // through the app's "@/..." alias, so vitest needs the same mapping
  // tsconfig.json's `paths` gives the Next build.
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Loads .env.local the way `next dev`/`next build` do, since Vitest
    // doesn't — without it, DATABASE_URL is absent and the leads-store
    // suite's describe.skipIf silently skips on every machine. See
    // tests/setup-env.ts.
    setupFiles: ['./tests/setup-env.ts'],
    /*
     * The pipeline/draft/admin suites all write into the real content/
     * directory — sidecars, city documents, and the two shared indexes
     * (_cities.json, _domains.json) which each suite snapshots and restores.
     * Run in parallel worker threads they interleave on those shared files:
     * one suite's restore can drop a key another suite has just registered,
     * and a sidecar can vanish mid-listing. Serializing test FILES (tests
     * within a file already run in order) removes the whole class of flake at
     * a cost of well under a second on this suite.
     */
    fileParallelism: false,
  },
})
