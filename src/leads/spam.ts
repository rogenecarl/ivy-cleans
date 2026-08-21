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
 */
import { createHash } from 'node:crypto'

/** Submissions allowed per ip hash per window. The caller is responsible for excluding preview submissions from recentCount. */
export const RATE_LIMIT = 5
export const RATE_WINDOW_MS = 10 * 60_000

export type SpamVerdict = { accept: true } | { accept: false; reason: 'honeypot' | 'rate-limit' }

export function hashIp(ip: string | null, salt: string): string | null {
  if (!ip) return null
  if (!salt || salt.trim() === '') {
    throw new Error('IP_HASH_SALT must not be empty or whitespace-only')
  }
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export function spamVerdict(args: {
  honeypotValue: string | null
  recentCount: number
}): SpamVerdict {
  if (args.honeypotValue && args.honeypotValue !== '') {
    return { accept: false, reason: 'honeypot' }
  }
  if (args.recentCount >= RATE_LIMIT) return { accept: false, reason: 'rate-limit' }
  return { accept: true }
}
