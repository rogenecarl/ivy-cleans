// src/lib/auth-rate-limit.ts
// Fixed-window limiter for the sign-in action (up to 2x maxRequests across a window edge — accepted).
// In-memory and per-instance: a speed bump on top of better-auth's own rule, which only sees its own endpoint.
// No setInterval sweep: sweeps inline on write.

type RateLimitRecord = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

/** Cap on tracked identifiers; exported for the eviction test. */
export const MAX_TRACKED = 10_000

type RateLimitConfig = {
  /** What is being limited, e.g. "sign-in". */
  key: string
  /** Who is being limited — the client IP. */
  identifier: string
  windowSeconds: number
  maxRequests: number
}

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds?: number
}

/** Tracked identifier count; exported for the MAX_TRACKED test. */
export function rateLimitTrackedCount(): number {
  return store.size
}

/** Drops expired records. Called on write, which is the only time the map
 * grows. */
function sweep(now: number): void {
  for (const [key, record] of store) {
    if (record.resetAt < now) store.delete(key)
  }
}

/** Consumes one token; `success: false` once the window is exhausted. */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { key, identifier, windowSeconds, maxRequests } = config
  const storeKey = `${key}:${identifier}`
  const now = Date.now()

  if (store.size >= MAX_TRACKED) {
    sweep(now)
    // sweep() only removes expired records, so evict the one closest to expiring to bound the map
    if (store.size >= MAX_TRACKED) {
      let oldestKey: string | null = null
      let oldestAt = Infinity
      for (const [k, r] of store) {
        if (r.resetAt < oldestAt) {
          oldestAt = r.resetAt
          oldestKey = k
        }
      }
      if (oldestKey !== null) store.delete(oldestKey)
    }
  }

  const record = store.get(storeKey)

  // No record, or the window has rolled over: start a fresh one.
  if (!record || record.resetAt < now) {
    store.set(storeKey, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { success: true, remaining: maxRequests - 1, resetAt: now + windowSeconds * 1000 }
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    }
  }

  record.count += 1
  return { success: true, remaining: maxRequests - record.count, resetAt: record.resetAt }
}

// five attempts per five minutes per IP, matching the '/sign-in/email' rule in auth.ts
export const RATE_LIMITS = {
  signIn: {
    windowSeconds: 300,
    maxRequests: 5,
  },
} as const
