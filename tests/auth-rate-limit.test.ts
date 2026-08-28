// tests/auth-rate-limit.test.ts
/*
 * src/lib/auth-rate-limit.ts shipped in Task 6 with no test at all, and its
 * MAX_TRACKED eviction was rewritten during that task's fix round on
 * reasoning alone. Task 9 is the first thing that actually calls
 * checkRateLimit (the sign-in server action), so the test lands here.
 *
 * Every test gets its own fresh module instance via vi.resetModules() + a
 * dynamic import, rather than sharing the one module-level `store` singleton
 * across the whole file. Without that, an earlier test's entries would still
 * be sitting in the map when a later test — especially the eviction one,
 * which needs to reason precisely about what is in the map — runs, making
 * the exact counts and "which key is soonest" assertions order-dependent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function freshRateLimit() {
  vi.resetModules()
  return import('@/lib/auth-rate-limit')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('checkRateLimit', () => {
  it('allows a caller under the limit, and counts remaining down', async () => {
    const { checkRateLimit } = await freshRateLimit()
    const config = { key: 'sign-in', identifier: '1.1.1.1', windowSeconds: 60, maxRequests: 3 }

    const first = checkRateLimit(config)
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(2)

    const second = checkRateLimit(config)
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(1)

    const third = checkRateLimit(config)
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('refuses the maxRequests + 1th call in one window', async () => {
    const { checkRateLimit } = await freshRateLimit()
    const config = { key: 'sign-in', identifier: '2.2.2.2', windowSeconds: 60, maxRequests: 3 }

    checkRateLimit(config)
    checkRateLimit(config)
    checkRateLimit(config)
    const fourth = checkRateLimit(config)

    expect(fourth.success).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSeconds).toBeDefined()
    expect(fourth.retryAfterSeconds!).toBeGreaterThan(0)
    expect(fourth.retryAfterSeconds!).toBeLessThanOrEqual(config.windowSeconds)
  })

  it('starts a fresh window once the old one has passed', async () => {
    const { checkRateLimit } = await freshRateLimit()
    const config = { key: 'sign-in', identifier: '3.3.3.3', windowSeconds: 60, maxRequests: 2 }

    checkRateLimit(config)
    checkRateLimit(config)
    const exhausted = checkRateLimit(config)
    expect(exhausted.success).toBe(false)

    // Advance past resetAt (now + windowSeconds*1000), not up to it.
    vi.setSystemTime(config.windowSeconds * 1000 + 1)

    const afterReset = checkRateLimit(config)
    expect(afterReset.success).toBe(true)
    expect(afterReset.remaining).toBe(config.maxRequests - 1)
  })

  it('does not let two different identifiers share a bucket', async () => {
    const { checkRateLimit } = await freshRateLimit()
    const base = { key: 'sign-in', windowSeconds: 60, maxRequests: 1 }

    // Exhaust identifier A entirely.
    const a1 = checkRateLimit({ ...base, identifier: 'a' })
    expect(a1.success).toBe(true)
    const a2 = checkRateLimit({ ...base, identifier: 'a' })
    expect(a2.success).toBe(false)

    // B has never been seen and must not inherit A's exhaustion.
    const b1 = checkRateLimit({ ...base, identifier: 'b' })
    expect(b1.success).toBe(true)
    expect(b1.remaining).toBe(0)
  })

  it('evicts the soonest-to-expire entry once MAX_TRACKED is reached, keeping the map bounded', async () => {
    const { checkRateLimit, MAX_TRACKED, rateLimitTrackedCount } = await freshRateLimit()
    expect(rateLimitTrackedCount()).toBe(0)

    /*
     * Fill the map to exactly MAX_TRACKED with LIVE, non-expired entries.
     * "soon" gets a 1-second window (resetAt = 1000); every other entry gets
     * the real sign-in window (300s, resetAt = 300_000), which is a very
     * long way from expiring at t=0. "soon" is therefore unambiguously the
     * single soonest-to-expire record in the whole map, tie or no tie.
     */
    checkRateLimit({ key: 'sign-in', identifier: 'soon', windowSeconds: 1, maxRequests: 5 })
    for (let i = 1; i < MAX_TRACKED; i++) {
      checkRateLimit({ key: 'sign-in', identifier: `id-${i}`, windowSeconds: 300, maxRequests: 5 })
    }
    expect(rateLimitTrackedCount()).toBe(MAX_TRACKED)

    // One more distinct identifier tips the map over MAX_TRACKED...
    const overflow = checkRateLimit({
      key: 'sign-in',
      identifier: 'overflow',
      windowSeconds: 300,
      maxRequests: 5,
    })
    expect(overflow.success).toBe(true)

    // ...and the map must not have been allowed to grow past the bound.
    expect(rateLimitTrackedCount()).toBe(MAX_TRACKED)

    /*
     * Confirm it was specifically "soon" that got dropped, not some other
     * live entry sacrificed at random: calling for "soon" again (still at
     * t=0, well before its original 1000ms resetAt would have rolled over
     * naturally) must look like a BRAND NEW caller. If "soon" had survived,
     * this would hit the "existing record" branch instead (count 1 -> 2,
     * remaining maxRequests - 2 = 3) rather than the fresh-window branch
     * (count -> 1, remaining maxRequests - 1 = 4) — the two are
     * distinguishable by `remaining` alone.
     */
    const afterEviction = checkRateLimit({
      key: 'sign-in',
      identifier: 'soon',
      windowSeconds: 1,
      maxRequests: 5,
    })
    expect(afterEviction.success).toBe(true)
    expect(afterEviction.remaining).toBe(4)
  })
})
