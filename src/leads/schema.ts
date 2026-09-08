// src/leads/schema.ts
// FormData -> validated fields, pure. Field names are the live Elementor names, byte-exact.
// TRAP: form_fields[email] is the email on the contact form but the service dropdown on the booking form.
import { z } from 'zod'

export const HONEYPOT_FIELD = 'form_fields[website_url]'

export type ParsedFields = {
  name: string | null
  email: string | null
  phone: string | null
  payload: Record<string, string>
}

export type ParseResult =
  | { ok: true; fields: ParsedFields }
  | { ok: false; fieldErrors: Record<string, string> }

// the live form's fields in render order. `required` mirrors the public markup; validation is derived from it
// (the server used to reject a Name the contact form marks optional).
export type LeadFormField = {
  /** The live `name` attribute the browser actually submits. */
  name: string
  /** Human label, for the payload / dashboard / email. */
  label: string
  /** Marked required in the public markup (src/data/book.ts, src/data/contact.ts). */
  required: boolean
}

/** Live fields, in the order the form renders them. */
export const BOOKING_FIELDS: readonly LeadFormField[] = [
  { name: "form_fields[email]", label: "What Type of Service Are Your Looking For?", required: true },
  { name: "form_fields[field_22aa910]", label: "How Would Your Describe Your Home Right Now?", required: true },
  { name: "form_fields[field_c4cfac1]", label: "How Many Bedrooms?", required: true },
  { name: "form_fields[field_caacb3a]", label: "How Many Bathrooms?", required: true },
  { name: "form_fields[message]", label: "How Soon Are You Looking To Have This Cleaned?", required: true },
  { name: "form_fields[field_1872bc3]", label: "What’s the Address of the Property?", required: true },
  { name: "form_fields[name]", label: "Full Name", required: true },
  { name: "form_fields[field_ca2243e]", label: "Email Address", required: true },
  { name: "form_fields[field_deeaf01]", label: "Phone Number", required: true },
  { name: "form_fields[field_1abcd81]", label: "How Would You Prefer To Be Contacted?", required: true },
]

export const CONTACT_FIELDS: readonly LeadFormField[] = [
  { name: "form_fields[name]", label: "Name", required: false },
  { name: "form_fields[email]", label: "Email", required: true },
  { name: "form_fields[field_66433ea]", label: "Phone Number", required: false },
  { name: "form_fields[message]", label: "Are You Looking For Help With A Cleaning Project?", required: true },
  { name: "form_fields[field_45db7dd]", label: "How Can We Help?", required: false },
]

// derived from the field table so the server is never stricter than the markup. `phone` stays optional:
// refusing a lead with a name and email over a missing phone loses a customer.
function identitySchema(nameRequired: boolean, emailRequired: boolean) {
  const name = z.string().trim().max(200)
  const email = z.string().trim().max(320)
  return z.object({
    name: nameRequired ? name.min(1, 'Please enter your name') : name,
    email: emailRequired
      ? email.email('Please enter a valid email address')
      : z.union([z.literal(''), email.email('Please enter a valid email address')]),
    phone: z.string().trim().max(50),
  })
}

function str(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Is `key` marked required in the live markup? Unknown keys default to required — a field this module lifts but the table does not describe is a bug, and the strict reading is the one that shows up in tests. */
function isRequired(fields: readonly LeadFormField[], key: string): boolean {
  return fields.find((field) => field.name === key)?.required ?? true
}

function parse(
  form: FormData,
  fields: readonly LeadFormField[],
  nameKey: string,
  emailKey: string,
  phoneKey: string,
): ParseResult {
  const identity = identitySchema(isRequired(fields, nameKey), isRequired(fields, emailKey))
  const parsed = identity.safeParse({
    name: str(form, nameKey),
    email: str(form, emailKey),
    phone: str(form, phoneKey),
  })

  if (!parsed.success) {
    const byField: Record<string, string> = {}
    const keyFor = { name: nameKey, email: emailKey, phone: phoneKey } as const
    for (const issue of parsed.error.issues) {
      const which = issue.path[0] as keyof typeof keyFor
      byField[keyFor[which]] = issue.message
    }
    return { ok: false, fieldErrors: byField }
  }

  const payload: Record<string, string> = {}
  for (const field of fields) payload[field.label] = str(form, field.name)

  // blank optional -> null; the dashboard's fallbacks key off null
  return {
    ok: true,
    fields: {
      name: parsed.data.name === '' ? null : parsed.data.name,
      email: parsed.data.email === '' ? null : parsed.data.email,
      phone: parsed.data.phone === '' ? null : parsed.data.phone,
      payload,
    },
  }
}

export function parseBookingForm(form: FormData): ParseResult {
  return parse(
    form,
    BOOKING_FIELDS,
    'form_fields[name]',
    'form_fields[field_ca2243e]',
    'form_fields[field_deeaf01]',
  )
}

export function parseContactForm(form: FormData): ParseResult {
  return parse(
    form,
    CONTACT_FIELDS,
    'form_fields[name]',
    'form_fields[email]',
    'form_fields[field_66433ea]',
  )
}
