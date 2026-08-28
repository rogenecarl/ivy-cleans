// tests/better-auth-api.test.ts
/*
 * A version pin with teeth.
 *
 * better-auth is pre-1.0-shaped in its churn: getSessionCookie and
 * getCookieCache did not exist in the 1.3 line and arrived in 1.4, and the
 * package publishes ~50 subpath exports whose contents move between minors.
 * Six symbols in this repo's auth wiring come from four different subpaths,
 * and a rename in any of them would otherwise surface as a runtime crash in
 * a route or, worse, as a proxy that silently stops recognising sessions.
 *
 * This test imports each one and asserts it is callable. It is not testing
 * better-auth; it is testing that the contract this repo coded against still
 * holds after `pnpm update`.
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { toNextJsHandler } from 'better-auth/next-js'
import { getSessionCookie, getCookieCache } from 'better-auth/cookies'
import { hashPassword } from 'better-auth/crypto'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'

describe('better-auth API surface', () => {
  it('exports everything src/lib/auth*.ts and src/proxy.ts import', () => {
    expect(typeof betterAuth).toBe('function')
    expect(typeof prismaAdapter).toBe('function')
    expect(typeof nextCookies).toBe('function')
    expect(typeof toNextJsHandler).toBe('function')
    expect(typeof getSessionCookie).toBe('function')
    expect(typeof getCookieCache).toBe('function')
    // src/app/admin/login/actions.ts narrows on this to tell "bad password"
    // apart from a genuine server fault. If it stops being a constructor the
    // login action silently reports every failure as an unexpected error.
    expect(typeof APIError).toBe('function')
  })

  it('exports the password hasher scripts/seed-user.mjs depends on', () => {
    // The seed script writes an account row that signInEmail must later be
    // able to verify. Hand-rolling the hash is the most likely way to produce
    // an account that exists but cannot sign in, so it uses better-auth's own.
    expect(typeof hashPassword).toBe('function')
  })
})

describe('email/password signup', () => {
  it('is disabled on the auth instance', () => {
    /*
     * better-auth mounts POST /api/auth/sign-up/email automatically the
     * moment emailAndPassword.enabled is true -- nothing in this app's UI
     * has to link to it. disableSignUp is the ONLY thing that refuses it
     * (sign-up.mjs's handler checks exactly this flag); `role.input: false`
     * elsewhere in src/lib/auth.ts stops privilege escalation, not account
     * creation, so it cannot substitute for this. Asserted on `auth.options`
     * itself (the literal object src/lib/auth.ts passes to betterAuth(),
     * exposed back on the returned instance) rather than by re-reading the
     * source file, so this fails the moment the config value actually
     * changes -- deleting the line, or someone "helpfully" flipping it back
     * to false -- not just when the text disappears.
     */
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true)
  })
})

describe('generated Prisma client', () => {
  it('exposes the two operator roles', async () => {
    // Guards the schema against a rename: src/lib/access.ts hard-codes these
    // two strings, and a mismatch between the enum and the policy would show
    // up as every operator being denied everything.
    const { UserRole } = await import('@/generated/prisma/client')
    expect(Object.values(UserRole).sort()).toEqual(['admin', 'manager'])
  })
})

describe('better-auth required columns', () => {
  it('are all present in the matching Prisma model', async () => {
    // Pins a bug class, not one bug: better-auth 1.7 added a required
    // `issuer` column to `account` (a breaking change from the 1.4-era
    // schema this project's models were originally copied from), and that
    // slipped past a version-pin test, a plan review and a task brief before
    // being caught. Rather than re-asserting `issuer` by name, this walks
    // every field better-auth's own schema builder marks `required: true` for
    // user/session/account/verification and checks each one has a matching
    // column in prisma/schema.prisma, so a future better-auth version adding
    // another required column fails loudly here instead of surfacing as an
    // inexplicable sign-up/sign-in failure at runtime.
    const { getAuthTables } = await import('better-auth/db')
    const tables = getAuthTables({})
    const schema = await readFile(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf-8')

    for (const tableKey of ['user', 'session', 'account', 'verification'] as const) {
      const modelName = tableKey[0].toUpperCase() + tableKey.slice(1)
      const modelMatch = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`))
      expect(modelMatch, `model ${modelName} not found in prisma/schema.prisma`).toBeTruthy()
      const modelBody = modelMatch![1]

      const requiredFields = Object.entries(tables[tableKey].fields)
        .filter(([, field]) => field.required)
        .map(([name]) => name)
      // Sanity check on the check itself: if better-auth ever reports zero
      // required fields for a table, this test would trivially pass without
      // proving anything.
      expect(requiredFields.length).toBeGreaterThan(0)

      for (const field of requiredFields) {
        const hasColumn = new RegExp(`^\\s*${field}\\s`, 'm').test(modelBody)
        expect(hasColumn, `${modelName}.${field} is required by better-auth but missing from prisma/schema.prisma`).toBe(true)
      }
    }
  })
})
