// src/app/admin/(console)/sites/logic.ts
// Pure decisions behind the site settings screen, testable without the Next runtime.

// per-input cap so ten reviews aren't rejected because the ZIP box also had something
export const MAX_OPS_FIELD_LENGTH = 8000

/** The raw strings the About facts form submits. Mirrors OpsFields in admin-logic. */
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
