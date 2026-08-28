// src/app/admin/(console)/sites/logic.ts
/*
 * Pure decisions behind the per-city notification settings screen, kept out
 * of site-actions.ts (a 'use server' file cannot be imported by vitest
 * without dragging in the Next server runtime -- see actions.ts's own
 * comment on why) so the parsing and validation can be exercised directly.
 * The same split leads/logic.ts uses for the Leads screen's link-building.
 */

// Deliberately simple: one "@", something on each side, a dot somewhere after
// it. Good enough to catch typos and pasted junk without rejecting a real,
// unusual address -- this is a notification inbox, not account signup.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Bounds on the raw submission. saveNotifyEmailsAction (site-actions.ts) is
 * authenticated (requireAdmin()) but still an untrusted RPC boundary: any
 * signed-in admin caller can hit it directly with no page ever rendered, so
 * a POST cannot be assumed to have come from the operator through the form
 * -- the same threat model lead-actions.ts states for MAX_NOTES_LENGTH.
 * MAX_RAW_LENGTH caps the body a hostile caller could force this action to
 * split and regex-test; MAX_ENTRIES caps how many rows one submission can
 * register. A city's notification list is a handful of human inboxes -- 50 is
 * generous headroom over any real one, small enough that pushing past it
 * cannot be used to grow a row without bound.
 */
export const MAX_RAW_LENGTH = 5000
export const MAX_ENTRIES = 50

export type ParseNotifyEmailsResult =
  | { ok: true; emails: string[]; invalidCount: number }
  | { ok: false; reason: string }

/**
 * `formData.get('emails')` in, a validated email list out.
 *
 * A field that is PRESENT and empty is the operator legitimately clearing the
 * inbox list -- `{ ok: true, emails: [], invalidCount: 0 }`. A field that is
 * ABSENT, or not a string (e.g. a File), is a malformed request and is
 * REJECTED rather than treated as an empty list. Task 11's saveNotesAction
 * draws the identical line for the notes field, for the identical reason:
 * collapsing "absent" into "empty" would let a malformed POST silently wipe a
 * city's notification inbox, and that city would go on collecting leads while
 * notifying nobody -- the exact failure this screen exists to surface.
 *
 * Entries beyond MAX_ENTRIES, and entries that do not look like an email, are
 * both counted in `invalidCount` rather than dropped without a trace: the
 * caller uses that count to tell the operator something was not saved,
 * instead of letting them believe an oversized or malformed paste succeeded
 * in full.
 */
export function parseNotifyEmails(raw: unknown): ParseNotifyEmailsResult {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'missing or invalid "emails" field' }
  }

  const allEntries = raw
    .slice(0, MAX_RAW_LENGTH)
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value !== '')

  const entries = allEntries.slice(0, MAX_ENTRIES)
  let invalidCount = allEntries.length - entries.length // truncated by the cap

  const emails: string[] = []
  for (const entry of entries) {
    if (EMAIL_PATTERN.test(entry)) emails.push(entry)
    else invalidCount += 1
  }

  return { ok: true, emails, invalidCount }
}
