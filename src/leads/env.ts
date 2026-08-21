// src/leads/env.ts
/*
 * The ONE place the leads feature reads its environment variables.
 *
 * WHY THIS FILE EXISTS. Three variables in this one feature had three
 * different "absent vs. empty" semantics, and two of them were actively
 * dangerous:
 *
 *   IP_HASH_SALT      `?? 'unsalted-dev-only'` — `??` only fires on
 *                     `undefined`, so the half-filled `IP_HASH_SALT=` line
 *                     that .env.local.example produces yields '', hashIp()
 *                     threw by design, and EVERY submission failed. Set to
 *                     nothing at all, it hashed real customer IPs with a
 *                     literal string committed to this public repository,
 *                     which defeats the entire point of salting. Both
 *                     branches were wrong; the fallback string is gone.
 *   LEADS_FROM_EMAIL  the identical `??` inversion: a blank value sent
 *                     `from: ''` and every notification failed at Resend.
 *   LEADS_DASHBOARD_ORIGIN  used truthiness and got it right by accident.
 *
 * The rule now, for all three: an absent variable and a blank/whitespace-only
 * one MEAN THE SAME THING — "not configured" — and are both resolved to
 * `null` exactly once, here, at module load. No caller writes
 * `process.env.<name>` for these again, so a fourth semantic cannot appear.
 *
 * Resolved at module load rather than per request so a misconfigured
 * deployment announces itself once, on the first import in the process,
 * instead of once per customer (or, worse, only on the customer whose
 * submission it refuses).
 */

/** `undefined` and blank/whitespace-only both mean "not configured" -> null. */
function read(name: string): string | null {
  const raw = process.env[name]
  if (raw === undefined) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Server-held salt for the stored IP hash. `null` = not configured.
 *
 * DEGRADES, never refuses: with no salt the submission is still captured and
 * still emailed, it just stores no ipHash, which costs the per-IP rate limit
 * and nothing else. Refusing to boot would take every city's marketing site
 * down over a spam control; refusing the submission would lose the customer.
 * Losing a customer is the worse failure, so this is the side we fail to.
 */
export const IP_HASH_SALT = read('IP_HASH_SALT')

/** Verified Resend sending address. `null` = not configured; the mailer then reports a legible failure instead of sending `from: ''`. */
export const LEADS_FROM_EMAIL = read('LEADS_FROM_EMAIL')

/** Canonical origin for the dashboard link in the notification email. `null` = not configured; the email omits the link rather than guess (see lead-actions.ts). */
export const LEADS_DASHBOARD_ORIGIN = read('LEADS_DASHBOARD_ORIGIN')

/**
 * Opt-in only. When `'1'`, disables Node's Happy Eyeballs (RFC 8305) address
 * racing process-wide before store.ts opens its `pg` Pool.
 *
 * Defaults OFF on purpose: racing addresses is the correct behaviour
 * anywhere IPv6 actually works (including Vercel's dual-stack functions) --
 * sequential connect attempts stall on an unreachable address for a full TCP
 * timeout, and RFC 8305 exists precisely to avoid that. This flag is for the
 * opposite failure mode, seen so far only in environments with NO IPv6 route
 * at all: the race itself can spuriously time out an otherwise-reachable
 * IPv4 address to a dual-stack host. Symptom to recognise: connections to a
 * dual-stack Postgres host (Neon's pooler, for instance) time out even
 * though the host is reachable -- verifiable by connecting directly to one
 * resolved IPv4 address instead of the hostname and seeing it succeed
 * immediately. See .env.example.
 */
export const DB_DISABLE_HAPPY_EYEBALLS = read('DB_DISABLE_HAPPY_EYEBALLS') === '1'

/*
 * One loud line per missing variable, once per process, at import time.
 *
 * Silenced under vitest only: the suite imports these modules with a
 * deliberately bare environment and the noise would train the reader to
 * ignore the warning that matters in production. Nothing else suppresses it
 * — dev is exactly where an operator should notice.
 */
if (!process.env.VITEST) {
  const missing: string[] = []
  if (IP_HASH_SALT === null) {
    missing.push(
      'IP_HASH_SALT is not set (or is blank) -- leads will be stored with NO ipHash, ' +
        'which disables per-IP rate limiting on the public forms. Submissions are still ' +
        'captured and still emailed. Set a random, stable value per environment.',
    )
  }
  if (LEADS_FROM_EMAIL === null) {
    missing.push(
      'LEADS_FROM_EMAIL is not set (or is blank) -- notification emails cannot be sent ' +
        'and every lead will be flagged "email not sent" in the dashboard. The lead itself ' +
        'is still captured. Set it to an address on the verified Resend domain.',
    )
  }
  if (LEADS_DASHBOARD_ORIGIN === null) {
    missing.push(
      'LEADS_DASHBOARD_ORIGIN is not set (or is blank) -- notification emails will omit ' +
        'the "Open in dashboard" link. Everything else is unaffected.',
    )
  }
  for (const line of missing) console.error(`leads env: ${line}`)
}
