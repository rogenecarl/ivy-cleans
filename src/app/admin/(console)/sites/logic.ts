// src/app/admin/(console)/sites/logic.ts
// Pure decisions behind the notification settings screen, testable without the Next runtime.

// one @, something each side, a dot after: a notification inbox, not signup
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// bounds on the raw submission: an authenticated but untrusted RPC boundary
export const MAX_RAW_LENGTH = 5000
export const MAX_ENTRIES = 50

export type ParseNotifyEmailsResult =
  | { ok: true; emails: string[]; invalidCount: number }
  | { ok: false; reason: string }

// present-and-empty clears the list; absent or non-string is REJECTED (a malformed POST must not wipe the inbox).
// Over-limit and malformed entries are counted in invalidCount rather than dropped silently.
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

// per-input cap so ten reviews aren't rejected because the ZIP box also had something
export const MAX_OPS_FIELD_LENGTH = 8000

/** The six raw strings the ops form submits. Mirrors OpsFields in admin-logic. */
export const OPS_FIELD_NAMES = [
  'zips',
  'servingSince',
  'crewLead',
  'crewSize',
  'homesCleaned',
  'reviews',
] as const

export type OpsFormFields = Record<(typeof OPS_FIELD_NAMES)[number], string>

export type ParseOpsFormResult =
  | { ok: true; fields: OpsFormFields }
  | { ok: false; reason: string }

// present-and-empty clears the fact; absent or non-string is rejected — saveOpsAction replaces the whole block
// and market facts can't be regenerated
export function parseOpsForm(formData: FormData): ParseOpsFormResult {
  const fields = {} as OpsFormFields
  for (const name of OPS_FIELD_NAMES) {
    const raw = formData.get(name)
    if (typeof raw !== 'string') {
      return { ok: false, reason: `missing or invalid "${name}" field` }
    }
    if (raw.length > MAX_OPS_FIELD_LENGTH) {
      return { ok: false, reason: `"${name}" is too long (over ${MAX_OPS_FIELD_LENGTH} characters)` }
    }
    fields[name] = raw
  }
  return { ok: true, fields }
}
