// tests/proxy.test.ts
/*
 * proxy() itself, exercising the ADAPTER'S composition rather than either
 * pure function alone.
 *
 * WHY THIS SUITE EXISTS: Task 11's code review caught a real regression that
 * neither pure-function suite could see. resolveRewrite's own tests
 * (middleware.test.ts) passed throughout, and resolveAdminRedirect's tests
 * passed throughout, because both are still correct in isolation — but
 * proxy.ts wired them together so the admin branch ran on EVERY host,
 * including a mapped customer domain, defeating the host scoping
 * resolveRewrite's case 3 documents. A passing unit test asserting a
 * property the wired-up system no longer has is worse than no test, so this
 * suite drives the real proxy() export end to end (a real NextRequest, the
 * real resolveAdminRedirect and resolveRewrite) and mocks only the two
 * things proxy() cannot control in a test: better-auth's cookie readers (the
 * one true side effect — reading request cookies) and resolve-rewrite's
 * isMappedHost (so the mapped-host case does not depend on
 * content/_domains.json, which is empty — no host is mapped yet — in every
 * environment this suite runs in).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../src/proxy'

const getSessionCookie = vi.fn()
const getCookieCache = vi.fn()
vi.mock('better-auth/cookies', () => ({
  getSessionCookie: (...args: unknown[]) => getSessionCookie(...args),
  getCookieCache: (...args: unknown[]) => getCookieCache(...args),
}))

const isMappedHost = vi.fn()
vi.mock('@/content/resolve-rewrite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content/resolve-rewrite')>()
  return { ...actual, isMappedHost: (...args: unknown[]) => isMappedHost(...args) }
})

function request(url: string, host: string): NextRequest {
  return new NextRequest(url, { headers: { host } })
}

// A realistic getCookieCache payload — the real return shape (better-auth's
// CookieCachePayload), not an invented one, so a wrong property path in
// proxy.ts (e.g. reading .role off the wrong object) would actually fail
// this test rather than being masked by a shape that happens to match the
// code under test.
function cachePayload(role: string) {
  const now = new Date()
  return {
    session: {
      id: 's1',
      userId: 'u1',
      token: 'tok',
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
    user: {
      id: 'u1',
      email: 'operator@ivycleans.com',
      emailVerified: true,
      name: 'Operator',
      image: null,
      createdAt: now,
      updatedAt: now,
      role,
    },
    updatedAt: Date.now(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  isMappedHost.mockReturnValue(false)
  getSessionCookie.mockReturnValue(null)
  getCookieCache.mockResolvedValue(null)
})

describe('proxy — console branch, wired end to end', () => {
  it('redirects a signed-out request to login carrying the original path as next', async () => {
    const res = await proxy(request('http://localhost:3100/admin/leads', 'localhost:3100'))
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toBe(
      'http://localhost:3100/admin/login?next=%2Fadmin%2Fleads',
    )
  })

  it('redirects a signed-in manager off an admin-only path to the dashboard', async () => {
    getSessionCookie.mockReturnValue('signed-cookie-value')
    getCookieCache.mockResolvedValue(cachePayload('manager'))

    const res = await proxy(request('http://localhost:3100/admin/sites', 'localhost:3100'))

    expect(res?.headers.get('location')).toBe('http://localhost:3100/admin/dashboard')
  })

  it('lets a signed-in admin through to an admin-only path with no redirect', async () => {
    getSessionCookie.mockReturnValue('signed-cookie-value')
    getCookieCache.mockResolvedValue(cachePayload('admin'))

    const res = await proxy(request('http://localhost:3100/admin/sites', 'localhost:3100'))

    expect(res).toBeUndefined()
  })

  it('never touches the cookie helpers for a non-admin path', async () => {
    const res = await proxy(request('http://localhost:3100/home', 'localhost:3100'))

    expect(getSessionCookie).not.toHaveBeenCalled()
    expect(getCookieCache).not.toHaveBeenCalled()
    // Falls through to the (unrelated) city rewrite, unaffected by this branch.
    expect(res?.headers.get('x-middleware-rewrite')).toContain('/minneapolis/home')
  })

  it('never engages the admin branch on a mapped customer host — falls through to the rewrite', async () => {
    // This is the regression: before the host gate, this request reached
    // resolveAdminRedirect and rendered a login box on a customer's own
    // domain. isMappedHost is stubbed true here because the real
    // content/_domains.json in this environment has no hosts registered yet
    // — the point under test is proxy.ts's own gating logic, which is
    // exercised identically regardless of which host is actually mapped.
    isMappedHost.mockReturnValue(true)

    await proxy(request('http://miamicleans.com/admin', 'miamicleans.com'))

    expect(getSessionCookie).not.toHaveBeenCalled()
    expect(getCookieCache).not.toHaveBeenCalled()
  })
})
