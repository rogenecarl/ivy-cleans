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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('does not 500 when getCookieCache throws on a malformed session_data cookie', async () => {
    // BLOCKER 2 of the final review: getCookieCache THROWS (rather than
    // returning null) on a non-base64 session_data cookie, or when
    // BETTER_AUTH_SECRET is missing from the runtime. An unhandled throw
    // here would fail this whole request with an unhandled rejection/500 —
    // for EVERY /admin path, including /admin/login, the only way back.
    // Proven here by actually rejecting the mock and asserting proxy()
    // still resolves, treating the cache as unreadable (passes through,
    // exactly as an absent cache does).
    getSessionCookie.mockReturnValue('garbage!!!')
    getCookieCache.mockRejectedValue(new Error('Invalid Base64 character'))

    await expect(
      proxy(request('http://localhost:3100/admin/sites', 'localhost:3100')),
    ).resolves.toBeUndefined()
  })

  it('does not 500 /admin/login itself on the same malformed cookie', async () => {
    getSessionCookie.mockReturnValue('garbage!!!')
    getCookieCache.mockRejectedValue(new Error('Invalid Base64 character'))

    await expect(
      proxy(request('http://localhost:3100/admin/login', 'localhost:3100')),
    ).resolves.toBeUndefined()
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

describe('loadRouting', () => {
  /*
   * Task 9. The host map moves from a build-time JSON import into Vercel
   * Global Config so a new site routes without a redeploy — content is
   * already Blob-backed, and that single import was the last thing forcing a
   * rebuild (see resolve-rewrite.ts's own header).
   *
   * These tests are about the FALLBACK, because that is what protects the
   * live site: a Global Config outage, or an unconfigured environment, must
   * degrade to the last deployed map rather than to nothing.
   */
  const priorEdgeConfig = process.env.EDGE_CONFIG

  afterEach(() => {
    if (priorEdgeConfig === undefined) delete process.env.EDGE_CONFIG
    else process.env.EDGE_CONFIG = priorEdgeConfig
  })

  it('returns the build-time JSON when Global Config is not configured at all', async () => {
    // The state every deployment is in today, and the one this must not break.
    delete process.env.EDGE_CONFIG
    const { loadRouting } = await import('../src/content/resolve-rewrite')
    const routing = await loadRouting()

    expect(routing.domains.default).toBe('minneapolis')
    expect(routing.cityKeys).toContain('minneapolis')
  })

  it('never throws, whatever the store does', async () => {
    // A routing read that throws is every page on every domain, so this is
    // the one behaviour worth pinning above all others.
    process.env.EDGE_CONFIG = 'https://edge-config.vercel.com/nonexistent?token=nope'
    const { loadRouting } = await import('../src/content/resolve-rewrite')
    await expect(loadRouting()).resolves.toBeDefined()
  })

  it('degrades to the deployed map, not to nothing, when the store is unreachable', async () => {
    process.env.EDGE_CONFIG = 'https://edge-config.vercel.com/nonexistent?token=nope'
    const { loadRouting } = await import('../src/content/resolve-rewrite')
    const routing = await loadRouting()

    expect(routing.domains.default).toBe('minneapolis')
    expect(routing.cityKeys.length).toBeGreaterThan(0)
  })

  it('feeds resolveRewrite unchanged — the pure functions keep their contract', async () => {
    delete process.env.EDGE_CONFIG
    const { loadRouting, resolveRewrite } = await import('../src/content/resolve-rewrite')
    const { domains, cityKeys } = await loadRouting()

    // Same answers the default-argument form gives, which is what makes the
    // proxy's switch to loadRouting() a no-op for every existing host.
    expect(resolveRewrite('example.com', '/home', domains, cityKeys)).toBe(resolveRewrite('example.com', '/home'))
    expect(resolveRewrite('example.com', '/minneapolis/home', domains, cityKeys)).toBe(
      resolveRewrite('example.com', '/minneapolis/home'),
    )
  })
})
