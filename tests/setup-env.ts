// tests/setup-env.ts
/*
 * Vitest does NOT load .env files the way `next dev`/`next build` do — only
 * Next's own tooling reads them automatically. Without this, DATABASE_URL
 * (and everything else in .env / .env.local) is simply absent under
 * `pnpm test`, which would make tests/leads-store.test.ts's
 * `describe.skipIf(!process.env.DATABASE_URL)` skip silently on every
 * machine, including CI-shaped local runs, with no indication the suite
 * never actually ran.
 *
 * Two files, layered to match Next's own precedence (.env.local overrides
 * .env): DATABASE_URL / DIRECT_DATABASE_URL live in .env because that's the
 * one filename the Prisma CLI itself auto-loads (see .env.example);
 * everything else lives in .env.local as before.
 *
 * Load order below is .env.local BEFORE .env, which looks backwards but
 * isn't: process.loadEnvFile only sets a key if it is not already present in
 * process.env — the FIRST file to set a key wins, later calls for the same
 * key are no-ops (verified directly: loading a file with FOO=a then a second
 * file with FOO=b leaves process.env.FOO as "a", not "b"). So to make
 * .env.local win over .env for any key both define, .env.local must be
 * loaded first. Each load is its own try/catch so a machine missing either
 * file (e.g. a clean checkout before secrets are configured) still runs with
 * whatever the ambient environment / other file provides, and DB-dependent
 * suites skip as designed.
 *
 * Node 20.6+ ships loadEnvFile natively, so no dotenv dependency is needed.
 */
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local present — fall back to .env / the ambient environment.
}
try {
  process.loadEnvFile('.env')
} catch {
  // No .env present — fall back to whatever .env.local / the ambient
  // environment already provided.
}
