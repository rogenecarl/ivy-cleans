// src/leads/spam.ts
// Honeypot (free; a bot is told it succeeded) and a salted IP hash (a raw or unsalted IPv4 hash is reversible).
// Two predicates so submit.ts can check the honeypot before hashing or querying.
import { createHash } from 'node:crypto'

/** Submissions allowed per ip hash per window. The caller is responsible for excluding preview submissions from recentCount. */
export const RATE_LIMIT = 5
export const RATE_WINDOW_MS = 10 * 60_000

// salt null = not configured: return null, capture the lead, skip the limit. A blank STRING still throws.
export function hashIp(ip: string | null, salt: string | null): string | null {
  if (!ip) return null
  if (salt === null) return null
  if (salt.trim() === '') {
    throw new Error(
      'IP_HASH_SALT must not be empty or whitespace-only -- pass null when it is not configured (see src/leads/env.ts)',
    )
  }
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

/** Any non-empty value, including whitespace-only, counts as filled. `null` and `''` do not. */
export function honeypotFilled(value: string | null): boolean {
  return value !== null && value !== ''
}

export function overRateLimit(recentCount: number): boolean {
  return recentCount >= RATE_LIMIT
}
