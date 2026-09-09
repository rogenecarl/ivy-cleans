#!/usr/bin/env node
// Asserts the internal link graph of every city (content/*.json, drafts included): no link leaves the tenant,
// every inner page has a breadcrumb, no page is orphaned, every area page is linked from a service page.
// Exits 1 on failure so it sits next to check-duplication.mjs in CI.
//
//   node scripts/check-links.mjs
import { spawnSync } from 'node:child_process'

const result = spawnSync('npx', ['vitest', 'run', 'tests/link-graph.test.ts', '--reporter=dot'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
