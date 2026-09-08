// src/leads/env.ts
// The one place the leads feature reads env. Absent and blank both mean "not configured" and resolve to null once,
// at module load. (`??` on IP_HASH_SALT used to hash real IPs with a committed fallback string.)

/** `undefined` and blank/whitespace-only both mean "not configured" -> null. */
function read(name: string): string | null {
  const raw = process.env[name]
  if (raw === undefined) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

// server-held salt for the stored IP hash. null = not configured: capture the lead, store no ipHash, skip the limit.
export const IP_HASH_SALT = read('IP_HASH_SALT')

/** Verified Resend sending address. `null` = not configured; the mailer then reports a legible failure instead of sending `from: ''`. */
export const LEADS_FROM_EMAIL = read('LEADS_FROM_EMAIL')

/** Canonical origin for the dashboard link in the notification email. `null` = not configured; the email omits the link rather than guess (see lead-actions.ts). */
export const LEADS_DASHBOARD_ORIGIN = read('LEADS_DASHBOARD_ORIGIN')

// '1' disables Node's Happy Eyeballs racing before db.ts opens its Pool. Off by default; only for environments with
// no IPv6 route where the race times out a reachable IPv4 host (Neon's pooler). See example.env.
export const DB_DISABLE_HAPPY_EYEBALLS = read('DB_DISABLE_HAPPY_EYEBALLS') === '1'

// one line per missing variable, once per process; silenced under vitest only
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
