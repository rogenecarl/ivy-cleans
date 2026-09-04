#!/usr/bin/env node
/*
 * scripts/seed-user.mjs — create or update a console operator account.
 *
 * This is the ONLY way an account comes into existence. There is no signup
 * route, by decision (see docs/superpowers/specs/2026-08-28-admin-auth-rbac-design.md):
 * the population is two people and a signup endpoint on a production console
 * is a liability that buys nothing.
 *
 *   SEED_PASSWORD='...' node --env-file=.env scripts/seed-user.mjs \
 *     --email you@example.com --name 'Your Name' --role admin
 *
 * SEED_PASSWORD is the preferred way to pass the password: a `--password`
 * CLI argument is visible in full, to any other local process, via `ps aux`
 * for the life of the run — an environment variable is not part of the argv
 * `ps aux` shows, so SEED_PASSWORD avoids that exposure and `--password`
 * does not. `--password` still works as a fallback (SEED_PASSWORD wins if
 * both are given), but since this script exists specifically for the owner
 * to create their own real production login, prefer the environment
 * variable. If you do use `--password`, a leading space before the command
 * keeps it out of shell history in shells configured with
 * `HISTCONTROL=ignorespace` (bash) or `HIST_IGNORE_SPACE` (zsh) — that only
 * helps with history, though, not the `ps aux` exposure above: typing
 * `SEED_PASSWORD='...' node ...` at an interactive prompt lands in shell
 * history exactly the same way `--password '...'` would.
 *
 * Re-running for an existing email updates the role and the password rather
 * than failing, which is also how a password gets changed — there is no
 * reset-by-email flow.
 *
 * WHY IT HASHES WITH better-auth's OWN hashPassword: the `account.password`
 * column has to hold exactly what auth.api.signInEmail later verifies
 * against. Hand-rolling scrypt with plausible parameters is the most likely
 * way to end up with an account that exists, looks right in the database,
 * and cannot sign in.
 *
 * WHY PLAIN pg AND NOT PRISMA: matches scripts/seed-demo-leads.mjs, and keeps
 * the script runnable without a `prisma generate` having happened first.
 *
 * WHY THE TWO WRITES ARE WRAPPED IN A TRANSACTION: `user` and `account` are
 * separate round trips. Without BEGIN/COMMIT, a failure between them on a
 * new email would leave a `user` row with no matching `account` row — an
 * account that exists and can never sign in, exactly what the hashPassword
 * comment above warns about, except now for a partial-write reason instead
 * of a wrong-hash one. Wrapping both writes means a failure anywhere in
 * between rolls back cleanly, and re-running is then a normal retry rather
 * than a manual cleanup.
 */
import { randomUUID } from 'node:crypto'
import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { Client } from 'pg'
import { hashPassword } from 'better-auth/crypto'
// Derived, never hardcoded. For email+password this returns 'local:credential',
// and sign-in matches on it exactly — a literal here would silently rot if
// better-auth ever changes the format, producing an account that exists but
// can never sign in. `better-auth/db` is the reachable public subpath;
// '@better-auth/core/db' is NOT resolvable from app code.
import { createLocalAccountIssuer } from 'better-auth/db'

const ROLES = ['admin', 'manager']
const MIN_PASSWORD_LENGTH = 8

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}

function fail(message) {
  console.error(`seed-user: ${message}`)
  process.exit(1)
}

const email = (arg('--email') ?? '').trim().toLowerCase()
const name = (arg('--name') ?? '').trim()
const role = (arg('--role') ?? '').trim()
// SEED_PASSWORD takes priority over --password; see the header comment.
const password = process.env.SEED_PASSWORD ?? arg('--password') ?? ''

if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL is not set. Run with: node --env-file=.env scripts/seed-user.mjs ...')
}
if (!email || !email.includes('@')) fail('--email is required and must look like an address')
if (!name) fail('--name is required')
if (!ROLES.includes(role)) fail(`--role must be one of: ${ROLES.join(', ')}`)
if (password.length < MIN_PASSWORD_LENGTH) {
  // Matches emailAndPassword.minPasswordLength in src/lib/auth.ts. A shorter
  // one would be accepted here and then rejected at sign-in, which is a
  // genuinely baffling failure to debug.
  fail(`--password must be at least ${MIN_PASSWORD_LENGTH} characters`)
}

/*
 * Connects, and on a connection failure retries once with Node's Happy
 * Eyeballs address race turned off and IPv4 preferred.
 *
 * WHY THE RETRY EXISTS. On a machine with no IPv6 route, `pg` connecting to a
 * dual-stack host by NAME fails with ETIMEDOUT even though the host is
 * perfectly reachable -- Node races the AAAA address and stalls on it. See
 * scripts/seed-demo-leads.mjs, where this same retry is measured against
 * this project's own Neon pooler.
 *
 * Applied on the RETRY rather than up front so a correctly dual-stacked
 * machine keeps the address race, which is the better behaviour there and
 * the whole point of RFC 8305.
 */
async function connect() {
  const open = async () => {
    const c = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 120000,
    })
    await c.connect()
    return c
  }
  try {
    return await open()
  } catch (err) {
    console.error(`First connection attempt failed (${err.code ?? err.message}).`)
    console.error('Retrying with IPv4 preferred and address racing disabled...')
    setDefaultAutoSelectFamily(false)
    setDefaultResultOrder('ipv4first')
    return open()
  }
}

async function main() {
  const client = await connect()
  try {
    const hash = await hashPassword(password)
    const now = new Date()

    await client.query('BEGIN')
    let userWasExisting
    let accountWasExisting
    try {
      const existing = await client.query('SELECT id FROM "user" WHERE email = $1', [email])
      let userId

      userWasExisting = existing.rowCount > 0
      if (userWasExisting) {
        userId = existing.rows[0].id
        await client.query(
          'UPDATE "user" SET name = $2, role = $3::"UserRole", "updatedAt" = $4 WHERE id = $1',
          [userId, name, role, now],
        )
      } else {
        userId = randomUUID()
        await client.query(
          `INSERT INTO "user" (id, name, email, role, "emailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4::"UserRole", true, $5, $5)`,
          [userId, name, email, role, now],
        )
      }

      /*
       * The credential row. providerId 'credential' and accountId = the user
       * id is the shape better-auth's email+password provider looks for;
       * anything else and signInEmail reports "invalid email or password"
       * for an account that plainly exists.
       */
      const account = await client.query(
        `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
        [userId],
      )
      accountWasExisting = account.rowCount > 0
      if (accountWasExisting) {
        await client.query('UPDATE account SET password = $2, "updatedAt" = $3 WHERE id = $1', [
          account.rows[0].id,
          hash,
          now,
        ])
      } else {
        await client.query(
          `INSERT INTO account (id, "accountId", issuer, "providerId", "userId", password, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'credential', $2, $4, $5, $5)`,
          [randomUUID(), userId, createLocalAccountIssuer('credential'), hash, now],
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    }

    /*
     * Logged only after COMMIT: before the transaction each write
     * auto-committed individually, so a line printed here meant the row was
     * already persisted. Now that both writes are one transaction, printing
     * before COMMIT would let a later rollback turn a "success" line into a
     * lie the operator has already read and acted on. This script's output
     * is the whole interface for the person running it.
     */
    console.log(`seed-user: ${userWasExisting ? 'updated existing' : 'created'} account (role=${role})`)
    console.log(`seed-user: password ${accountWasExisting ? 'updated' : 'set'}`)
    // Never log the address itself — the same rule site-actions.ts follows.
    console.log('seed-user: done. Sign in at /admin/login.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  /*
   * An AggregateError from `pg` prints as an EMPTY message -- every real
   * cause is hidden in `err.errors`, one entry per address tried. Unwrapped,
   * a failure to reach the database reads as "seed-user: failed:" and
   * nothing else, which says nothing about whether the credential is wrong,
   * the host is down, or the network has no route. This matters more here
   * than in most scripts: the repo owner runs this by hand, once, against
   * production, to create their own account, and this error message is the
   * entire interface they get if it fails.
   */
  console.error('seed-user: failed:', err.message || err.code || err.name || err)
  if (Array.isArray(err.errors)) {
    for (const sub of err.errors) console.error(`  - ${sub.code}: ${sub.message}`)
    const v6 = err.errors.filter((e) => e.code === 'ENETUNREACH').length
    const v4 = err.errors.filter((e) => e.code === 'ETIMEDOUT').length
    if (v6 > 0 && v4 === 0) {
      console.error(
        '\nEvery IPv6 address was unreachable, and the automatic IPv4-only retry above did not help either.',
      )
      console.error('This machine likely has no IPv6 route to the database host.')
    } else if (v4 > 0) {
      console.error('\nThe database host is not reachable from this machine at all.')
      console.error('Check the network/firewall and that the Neon project is not suspended.')
    }
  }
  process.exit(1)
})
