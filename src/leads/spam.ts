// src/leads/spam.ts
/*
 * Two cheap guards on a public, unauthenticated endpoint.
 *
 * The honeypot is a field a human never sees and a naive bot always fills.
 * Failing it returns SUCCESS to the caller (see submit.ts) so the bot learns
 * nothing about why it was dropped.
 *
 * The IP is hashed with a server-held salt before it is ever stored: the
 * database must never hold a raw address, and an unsalted hash of an IPv4
 * address is trivially reversible by enumerating the whole space.
 *
 * These are exposed as two separate predicates, not one combined verdict,
 * because the honeypot check is free and the rate-limit check costs a
 * database read. submit.ts is responsible for checking the honeypot FIRST
 * and returning before ever hashing the IP or querying the count -- a bot
 * that trips the honeypot must cost nothing beyond a string comparison.
 */
import { createHash } from 'node:crypto'

/** Submissions allowed per ip hash per window. The caller is responsible for excluding preview submissions from recentCount. */
export const RATE_LIMIT = 5
export const RATE_WINDOW_MS = 10 * 60_000

/**
 * `salt: null` means IP_HASH_SALT is not configured (src/leads/env.ts resolves
 * both an absent variable and a blank one to null, and logs it once at boot).
 * That returns null: the lead is captured with no ipHash and the per-IP rate
 * limit is skipped for it. Refusing the submission instead would lose a real
 * customer over a spam control, which is the worse trade.
 *
 * A blank/whitespace-only STRING still throws. env.ts is the only supported
 * source of this argument and never produces one, so at this point it can
 * only be a caller that reconstructed the salt itself -- exactly the mistake
 * that must not silently produce a reversible hash.
 */
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
