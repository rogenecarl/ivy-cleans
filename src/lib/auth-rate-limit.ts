// src/lib/auth-rate-limit.ts
/*
 * Sliding-window limiter for the sign-in server action, after
 * peaktransport/src/lib/auth-rate-limit.ts.
 *
 * IN-MEMORY, and therefore per-instance: it resets on restart, and a second
 * Vercel instance keeps its own counter. It is a speed bump on top of
 * better-auth's own /sign-in/email rule (src/lib/auth.ts), not a distributed
 * limiter. Both exist because the server action can be POSTed directly and
 * better-auth's rule only sees requests that reach its own endpoint.
 *
 * NO setInterval sweep, unlike the version this came from. A module-level
 * timer in a Next server module runs in every worker, keeps the event loop
 * referenced, and in dev re-registers on each module re-evaluation. Sweeping
 * inline on write costs nothing at this volume and has none of that.
 */

type RateLimitRecord = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

/** Bounded so a flood of distinct identifiers cannot grow the map without
 * limit. Well above any real operator count; if it is ever hit, the sweep
 * below has already removed everything expired. */
const MAX_TRACKED = 10_000

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

/** Drops expired records. Called on write, which is the only time the map
 * grows. */
function sweep(now: number): void {
  for (const [key, record] of store) {
    if (record.resetAt < now) store.delete(key)
  }
}

/**
 * Consumes one token. Returns `success: false` once the window is exhausted,
 * with the seconds until it reopens.
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { key, identifier, windowSeconds, maxRequests } = config
  const storeKey = `${key}:${identifier}`
  const now = Date.now()

  if (store.size >= MAX_TRACKED) sweep(now)

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

/**
 * Five attempts per five minutes per IP.
 *
 * Matches the '/sign-in/email' customRule in src/lib/auth.ts on purpose —
 * two limits with different numbers would make "why was I blocked" impossible
 * to answer.
 */
export const RATE_LIMITS = {
  signIn: {
    windowSeconds: 300,
    maxRequests: 5,
  },
} as const
