// src/leads/schema.ts
/*
 * FormData in, validated fields out. Pure: no database, no framework.
 *
 * The `name` attributes below are the LIVE Elementor names, kept byte-exact
 * because the public markup is a fidelity clone and must not change. They are
 * opaque ids, so this module maps each one to its human label for the payload
 * — that label is what the dashboard and the notification email display.
 *
 * TRAP: form_fields[email] means completely different things on the two forms.
 * On the contact form it really is the email address. On the booking form it is
 * the service-type dropdown, because Elementor reused the slot. Do not assume
 * they are the same without checking the actual form data.
 */
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

/**
 * The live form's fields, in render order: the Elementor submission name, the
 * human label the dashboard and the email show, and whether the field is
 * marked required IN THE PUBLIC MARKUP.
 *
 * `required` is not decoration. It used to live only in src/data/*.ts while
 * this module hardcoded its own idea of which fields were mandatory — and the
 * two disagreed: the contact form renders Name as OPTIONAL and the server
 * rejected any submission without one, so a customer doing exactly what the
 * page allowed got an error. Nothing could catch it, because the drift guard
 * (tests/leads-schema.test.ts) compared names and labels only.
 *
 * Both halves are now closed: the guard compares `required` too, and the
 * validation below is DERIVED from these flags instead of restating them.
 */
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

/**
 * The identity rules, derived from the field table so the server can never be
 * STRICTER than the markup claims to be.
 *
 * The direction matters. Server-stricter-than-markup rejects a customer who
 * did exactly what the page allowed — the I2 defect. Server-more-lenient is
 * harmless: the browser already enforces `required`, and accepting a field
 * the markup insisted on costs nothing (every one of these columns is
 * nullable in Prisma).
 *
 * So `name` and `email` follow the table exactly, and `phone` stays optional
 * unconditionally — booking marks it required, but refusing to store a lead
 * that carries a name and a working email address, over a missing phone
 * number, would lose a real customer to satisfy a form attribute.
 */
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

  // An optional field left blank is null, not '' -- Lead.name/email/phone are
  // all nullable in Prisma, and the dashboard's "No name given" / "No contact
  // info" fallbacks key off null. Same rule for all three.
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
