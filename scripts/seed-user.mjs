#!/usr/bin/env node
/*
 * scripts/seed-user.mjs — create or update a console operator account.
 *
 * This is the ONLY way an account comes into existence. There is no signup
 * route, by decision (see docs/superpowers/specs/2026-08-28-admin-auth-rbac-design.md):
 * the population is two people and a signup endpoint on a production console
 * is a liability that buys nothing.
 *
 *   node --env-file=.env scripts/seed-user.mjs \
 *     --email you@example.com --name 'Your Name' --role admin --password '...'
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
 */
import { randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { hashPassword } from 'better-auth/crypto'
// Derived, never hardcoded. For email+password this returns 'local:credential',
// and sign-in matches on it exactly — a literal here would silently rot if
// better-auth ever changes the format, producing an account that exists but
// can never sign in. `better-auth/db` is the reachable public subpath;
// '@better-auth/core/db' is NOT resolvable from app code.
import { createLocalAccountIssuer } from 'better-auth/db'

const ROLES = ['admin', 'manager']
const MIN_PASSWORD_LENGTH = 12

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
const password = arg('--password') ?? ''

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

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  const hash = await hashPassword(password)
  const now = new Date()

  const existing = await client.query('SELECT id FROM "user" WHERE email = $1', [email])
  let userId

  if (existing.rowCount > 0) {
    userId = existing.rows[0].id
    await client.query(
      'UPDATE "user" SET name = $2, role = $3, "updatedAt" = $4 WHERE id = $1',
      [userId, name, role, now],
    )
    console.log(`seed-user: updated existing account (role=${role})`)
  } else {
    userId = randomUUID()
    await client.query(
      `INSERT INTO "user" (id, name, email, role, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, $5, $5)`,
      [userId, name, email, role, now],
    )
    console.log(`seed-user: created account (role=${role})`)
  }

  /*
   * The credential row. providerId 'credential' and accountId = the user id
   * is the shape better-auth's email+password provider looks for; anything
   * else and signInEmail reports "invalid email or password" for an account
   * that plainly exists.
   */
  const account = await client.query(
    `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [userId],
  )
  if (account.rowCount > 0) {
    await client.query('UPDATE account SET password = $2, "updatedAt" = $3 WHERE id = $1', [
      account.rows[0].id,
      hash,
      now,
    ])
    console.log('seed-user: password updated')
  } else {
    await client.query(
      `INSERT INTO account (id, "accountId", issuer, "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'credential', $2, $4, $5, $5)`,
      [randomUUID(), userId, createLocalAccountIssuer('credential'), hash, now],
    )
    console.log('seed-user: password set')
  }

  // Never log the address itself — the same rule site-actions.ts follows.
  console.log('seed-user: done. Sign in at /admin/login.')
} finally {
  await client.end()
}
