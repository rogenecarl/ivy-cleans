// tests/setup-env.ts
/*
 * Vitest does NOT load .env.local the way `next dev`/`next build` do — only
 * Next's own tooling reads it automatically. Without this, DATABASE_URL (and
 * everything else in .env.local) is simply absent under `pnpm test`, which
 * would make tests/leads-store.test.ts's `describe.skipIf(!process.env.DATABASE_URL)`
 * skip silently on every machine, including CI-shaped local runs, with no
 * indication the suite never actually ran.
 *
 * Node 20.6+ ships loadEnvFile natively, so no dotenv dependency is needed.
 * The try/catch covers machines with no .env.local (e.g. a clean checkout
 * before secrets are configured) — in that case tests fall back to whatever
 * is already in the environment, and DB-dependent suites skip as designed.
 */
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local present — fall back to the ambient environment.
}
