// tests/auth-server.test.ts
/*
 * src/lib/auth-server.ts calls itself "THE ENFORCEMENT POINT" -- every other
 * suite that touches it (tests/auth-guards.test.ts, the page-guard tests)
 * mocks the whole module away, on purpose: those suites are about whether a
 * caller invokes a guard, not whether the guard itself is correct. That left
 * the guard's own logic with no test at all. Concretely: flipping
 * requireAdmin's comparison to `user.role !== 'manager'` (locking every real
 * admin out of Sites and letting every manager into the pipeline) still left
 * all 486 tests green before this file existed -- see the RED evidence below
 * for requireAdmin, captured by hand before this file was written.
 *
 * No database, no server: auth.api.getSession and next/headers are mocked,
 * so this is a pure test of auth-server.ts's own branching.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const REDIRECTED = 'NEXT_REDIRECT'
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`${REDIRECTED}:${to}`)
  },
}))

vi.mock('next/headers', () => ({
  // auth-server.ts only ever passes this straight through to
  // auth.api.getSession({ headers }); its content never matters here.
  headers: async () => new Headers(),
}))

const getSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))

function sessionWithRole(role: unknown) {
  return {
    user: { id: 'u1', name: 'Test Operator', email: 'operator@example.invalid', role },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getServerUser', () => {
  it('returns null when there is no session', async () => {
    getSession.mockResolvedValue(null)
    const { getServerUser } = await import('@/lib/auth-server')
    await expect(getServerUser()).resolves.toBeNull()
  })

  it('returns null and logs when the session user has an unrecognised role', async () => {
    // The fail-closed property: a role the database has that
    // src/lib/access.ts does not know about must be treated as signed out,
    // not defaulted to either real role.
    getSession.mockResolvedValue(sessionWithRole('superadmin'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getServerUser } = await import('@/lib/auth-server')
    await expect(getServerUser()).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('returns the user for each known role', async () => {
    const { getServerUser } = await import('@/lib/auth-server')
    for (const role of ['admin', 'manager'] as const) {
      getSession.mockResolvedValue(sessionWithRole(role))
      await expect(getServerUser()).resolves.toEqual({
        id: 'u1',
        name: 'Test Operator',
        email: 'operator@example.invalid',
        role,
      })
    }
  })
})

describe('requireSession', () => {
  it('redirects to /admin/login when signed out', async () => {
    getSession.mockResolvedValue(null)
    const { requireSession } = await import('@/lib/auth-server')
    await expect(requireSession()).rejects.toThrow(`${REDIRECTED}:/admin/login`)
  })

  it('encodes a given `next` into the login redirect', async () => {
    getSession.mockResolvedValue(null)
    const { requireSession } = await import('@/lib/auth-server')
    await expect(requireSession('/admin/sites/miami')).rejects.toThrow(
      `${REDIRECTED}:/admin/login?next=${encodeURIComponent('/admin/sites/miami')}`,
    )
  })

  it('returns the user when signed in, for either role', async () => {
    const { requireSession } = await import('@/lib/auth-server')
    getSession.mockResolvedValue(sessionWithRole('manager'))
    await expect(requireSession()).resolves.toMatchObject({ role: 'manager' })
    getSession.mockResolvedValue(sessionWithRole('admin'))
    await expect(requireSession()).resolves.toMatchObject({ role: 'admin' })
  })
})

describe('requireAdmin', () => {
  it('redirects a signed-out caller to /admin/login, not the dashboard', async () => {
    getSession.mockResolvedValue(null)
    const { requireAdmin } = await import('@/lib/auth-server')
    await expect(requireAdmin()).rejects.toThrow(`${REDIRECTED}:/admin/login`)
  })

  it('bounces a signed-in manager to /admin/dashboard, not to login', async () => {
    // The distinction the header comment on requireAdmin insists on: a
    // manager is AUTHENTICATED, just not AUTHORIZED, so the redirect target
    // must differ from the signed-out case above.
    getSession.mockResolvedValue(sessionWithRole('manager'))
    const { requireAdmin } = await import('@/lib/auth-server')
    await expect(requireAdmin()).rejects.toThrow(`${REDIRECTED}:/admin/dashboard`)
  })

  it('returns the user for an admin', async () => {
    getSession.mockResolvedValue(sessionWithRole('admin'))
    const { requireAdmin } = await import('@/lib/auth-server')
    await expect(requireAdmin()).resolves.toMatchObject({ role: 'admin' })
  })
})
