// tests/login-action.test.ts
/*
 * src/app/admin/login/actions.ts's signInAction carried this branch's one
 * real bug (the getServerUser()/headers() staleness bug documented in its
 * own long comment) and had no unit test of its own -- everything that
 * touched sign-in was the e2e script, in a real browser. This suite covers
 * the two things that matter about the function's own logic, independent of
 * better-auth's internals: it refuses a signed-in user whose role is not one
 * of the two known values (and, per the final review, signs that session
 * back out rather than leaving a live cookie behind), and it hands a
 * successful sign-in's `next` through access.ts's REAL safeNext() rather
 * than trusting it unvalidated.
 *
 * auth.api.signInEmail/signOut are mocked; the rate limiter and the client
 * IP lookup are mocked out of the way since they have their own suites
 * (tests/auth-rate-limit.test.ts) and are not what this file is testing.
 * access.ts (isRole, safeNext) is left REAL on purpose -- mocking safeNext
 * would make the "redirects through safeNext" assertion vacuous.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError } from 'better-auth/api'
import type { RateLimitResult } from '@/lib/auth-rate-limit'

const REDIRECTED = 'NEXT_REDIRECT'
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`${REDIRECTED}:${to}`)
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

const signInEmail = vi.fn()
const signOut = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signInEmail: (...args: unknown[]) => signInEmail(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  },
}))

// Not what this suite tests -- see tests/auth-rate-limit.test.ts. Always
// succeeds so sign-in attempts here never trip the real limiter.
const checkRateLimit = vi.fn<(config: unknown) => RateLimitResult>(
  () => ({ success: true, remaining: 4, resetAt: Date.now() + 1000 }),
)
vi.mock('@/lib/auth-rate-limit', () => ({
  checkRateLimit: (config: unknown) => checkRateLimit(config),
  RATE_LIMITS: { signIn: { windowSeconds: 300, maxRequests: 5 } },
}))

vi.mock('@/leads/client-ip', () => ({ clientIp: () => '203.0.113.1' }))

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

const CREDENTIALS_REJECTED = 'Wrong email or password.'

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimit.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 1000 })
})

describe('signInAction', () => {
  it('returns early, without calling signInEmail, when email or password is missing', async () => {
    const { signInAction } = await import('@/app/admin/login/actions')
    const result = await signInAction(null, formData({ email: '', password: 'x' }))
    expect(result).toEqual({ error: 'Enter your email and password.' })
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('reports the rate limiter refusing an attempt, without calling signInEmail', async () => {
    checkRateLimit.mockReturnValue({ success: false, remaining: 0, resetAt: 0, retryAfterSeconds: 42 })
    const { signInAction } = await import('@/app/admin/login/actions')
    const result = await signInAction(
      null,
      formData({ email: 'operator@example.invalid', password: 'password12345' }),
    )
    expect(result).toEqual({ error: 'Too many attempts. Try again in 42 seconds.' })
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('reports the ONE generic message on an APIError from signInEmail (bad credentials)', async () => {
    signInEmail.mockRejectedValue(new APIError('UNAUTHORIZED', { message: 'invalid email or password' }))
    const { signInAction } = await import('@/app/admin/login/actions')
    const result = await signInAction(
      null,
      formData({ email: 'operator@example.invalid', password: 'password12345' }),
    )
    expect(result).toEqual({ error: CREDENTIALS_REJECTED })
  })

  it('rejects a response whose role is not one of the two known roles, and signs the session back out', async () => {
    // The exact scenario BLOCKER 1's login-actions fix addresses: better-auth
    // already set a live session cookie via nextCookies() by the time this
    // check runs (signInEmail succeeded), so simply returning an error here
    // would leave that cookie in place -- passing the proxy's presence check
    // while auth-server.ts can never treat it as authorized. This is the
    // property that would NOT fail without the fix: only the signOut
    // assertion pins it, since the rejection message alone is unchanged.
    signInEmail.mockResolvedValue({ user: { id: 'u1', role: 'superadmin' } })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { signInAction } = await import('@/app/admin/login/actions')
    const result = await signInAction(
      null,
      formData({ email: 'operator@example.invalid', password: 'password12345' }),
    )
    expect(result).toEqual({ error: CREDENTIALS_REJECTED })
    expect(signOut).toHaveBeenCalledTimes(1)
    errorSpy.mockRestore()
  })

  it('redirects to the given `next` through safeNext when it is one the role can reach', async () => {
    signInEmail.mockResolvedValue({ user: { id: 'u1', role: 'admin' } })
    const { signInAction } = await import('@/app/admin/login/actions')
    await expect(
      signInAction(
        null,
        formData({
          email: 'operator@example.invalid',
          password: 'password12345',
          next: '/admin/sites',
        }),
      ),
    ).rejects.toThrow(`${REDIRECTED}:/admin/sites`)
  })

  it("redirects a manager's own out-of-reach `next` to the dashboard, via safeNext, not to the page itself", async () => {
    // Proves safeNext is actually being called with the signed-in role, not
    // just echoed: /admin/sites is admin-only, so a manager's `next` must be
    // overridden even though the string itself is a well-formed admin path.
    signInEmail.mockResolvedValue({ user: { id: 'u2', role: 'manager' } })
    const { signInAction } = await import('@/app/admin/login/actions')
    await expect(
      signInAction(
        null,
        formData({
          email: 'manager@example.invalid',
          password: 'password12345',
          next: '/admin/sites',
        }),
      ),
    ).rejects.toThrow(`${REDIRECTED}:/admin/dashboard`)
  })

  it('redirects to the dashboard when no `next` was given', async () => {
    signInEmail.mockResolvedValue({ user: { id: 'u1', role: 'admin' } })
    const { signInAction } = await import('@/app/admin/login/actions')
    await expect(
      signInAction(null, formData({ email: 'operator@example.invalid', password: 'password12345' })),
    ).rejects.toThrow(`${REDIRECTED}:/admin/dashboard`)
  })
})
