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
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { toNextJsHandler } from 'better-auth/next-js'
import { getSessionCookie, getCookieCache } from 'better-auth/cookies'
import { hashPassword } from 'better-auth/crypto'
import { APIError } from 'better-auth/api'

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

describe('generated Prisma client', () => {
  it('exposes the two operator roles', async () => {
    // Guards the schema against a rename: src/lib/access.ts hard-codes these
    // two strings, and a mismatch between the enum and the policy would show
    // up as every operator being denied everything.
    const { UserRole } = await import('@/generated/prisma/client')
    expect(Object.values(UserRole).sort()).toEqual(['admin', 'manager'])
  })
})
