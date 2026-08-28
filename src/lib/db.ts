// src/lib/db.ts
/*
 * The Prisma client, and the only place one is constructed.
 *
 * Was the top of src/leads/store.ts until authentication arrived: better-auth
 * needs the same client, and importing it from the leads store would have
 * dragged the entire lead API into the auth module. Two clients was the wrong
 * answer — that is two `pg` Pools against the same Neon project, doubling the
 * connection count a serverless function can hold open, for no gain.
 *
 * Everything below is moved verbatim. The comments are measurements, not
 * theory; keep them.
 */
import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { DB_DISABLE_HAPPY_EYEBALLS } from '@/leads/env'

/*
 * Prisma 6's connections went through its own Rust engine binary; Prisma 7's
 * driver-adapter client routes them through Node's own `net` module instead,
 * via `pg`. In this repo's own sandbox, that surfaced as connections to
 * Neon's pooler hostname timing out (`ETIMEDOUT`) even though connecting
 * directly to one of its resolved IPv4 addresses succeeded instantly --
 * reproduced the same way against a second, unrelated Neon host from the
 * same sandbox, which is why DB_DISABLE_HAPPY_EYEBALLS exists as an opt-in
 * rather than being applied unconditionally: it is not certain this is safe
 * everywhere. In particular, whether Node's `fetch`/undici (used for Resend,
 * Anthropic, Vercel Blob) inherits this same process-wide default is NOT
 * verified here either way -- do not assume it is unaffected. See
 * src/leads/env.ts for the full explanation and example.env for when to
 * set it.
 */
if (DB_DISABLE_HAPPY_EYEBALLS) {
  setDefaultAutoSelectFamily(false)
  /*
   * BOTH calls, not just the first. Disabling the address race alone leaves
   * Node trying the resolver's order, which for a dual-stack host puts the
   * AAAA record first -- so on a machine with no IPv6 route every connection
   * still stalls on an unreachable IPv6 address before it ever reaches IPv4,
   * and the flag appears to do nothing.
   *
   * MEASURED, not theorised: against this project's own Neon pooler from a
   * sandbox with no IPv6 route, `pg` connecting by hostname failed with
   * ETIMEDOUT while a raw TCP connect to one of that host's resolved IPv4
   * addresses succeeded in 259ms. Adding this line took the same connection
   * from failing to succeeding in 1.9s.
   */
  setDefaultResultOrder('ipv4first')
}

/*
 * Prisma 7 has no built-in engine for driver-adapter clients (schema.prisma's
 * datasource carries no `url`); the client is handed a `@prisma/adapter-pg`
 * wrapping a real `pg` Pool instead, using the same pooled Neon connection
 * string the schema's `url` used to read directly.
 */
/*
 * Pool settings match trip-scheduler/src/lib/prisma.ts, the owner's other
 * Prisma 7 + Neon project, because these are not arbitrary: pg's defaults are
 * wrong for a serverless caller.
 *
 * connectionTimeoutMillis is the one that matters. Unset, pg-pool applies NO
 * connect timeout at all (`if (!this.options.connectionTimeoutMillis)` in
 * pg-pool/index.js) and a hung connect waits forever -- which in a Vercel
 * function means a customer's form submission hanging until the platform kills
 * it, instead of failing fast into the "call us instead" panel that submit.ts
 * already renders on a storage error. Bounded, a stalled database costs that
 * customer 30 seconds and a legible message.
 *
 * statement_timeout bounds a runaway query holding a pooled connection open.
 * idleTimeoutMillis raises pg's 10s default so a warm function reuses its
 * connection instead of reconnecting on every request.
 */
function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
  })
  const adapter = new PrismaPg(pool)
  /*
   * Without this, Prisma reports nothing: a failing query surfaces only as
   * whatever the caller does with the rejection. The store's callers turn a
   * failure into a friendly panel or a degraded dashboard, so the server log
   * is the only place the real cause is ever visible.
   */
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

/*
 * One client per process. Next's dev server re-evaluates modules on every
 * edit, which would otherwise open a new pool per reload until Neon refuses
 * connections, so the instance is parked on globalThis in development. This
 * matters even more now than under Prisma 6: the adapter holds a real `pg`
 * Pool with live TCP sockets, not just a lazily-connected engine handle.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
