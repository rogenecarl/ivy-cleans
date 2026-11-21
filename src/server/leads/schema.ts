// src/server/leads/schema.ts
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

export type FieldRule =
  | { kind: 'text'; max: number }
  | { kind: 'email' }
  | { kind: 'count'; min: number; max: number }
  | { kind: 'choice' }

// the live form's fields in render order. `required` mirrors the public markup. The server's checks (fieldSchema) and
// the browser's attributes (browserLimits) both derive from this table, so the page and the server can't disagree.
export type LeadFormField = {
  /** The live `name` attribute the browser actually submits. */
  name: string
  /** Human label, for the payload / dashboard / email. */
  label: string
  /** Marked required in the public markup (src/site/data/book.ts, src/site/data/contact.ts). */
  required: boolean
  rule: FieldRule
}

const NAME: FieldRule = { kind: 'text', max: 200 }
const PHONE: FieldRule = { kind: 'text', max: 50 }
const EMAIL: FieldRule = { kind: 'email' }
const ROOMS: FieldRule = { kind: 'count', min: 0, max: 20 }
const CHOICE: FieldRule = { kind: 'choice' }
const EMAIL_MAX = 320
const CHOICE_MAX = 200

/** Live fields, in the order the form renders them. */
export const BOOKING_FIELDS: readonly LeadFormField[] = [
  { name: "form_fields[email]", label: "What Type of Service Are Your Looking For?", required: true, rule: CHOICE },
  { name: "form_fields[field_22aa910]", label: "How Would Your Describe Your Home Right Now?", required: true, rule: CHOICE },
  { name: "form_fields[field_c4cfac1]", label: "How Many Bedrooms?", required: true, rule: ROOMS },
  { name: "form_fields[field_caacb3a]", label: "How Many Bathrooms?", required: true, rule: ROOMS },
  { name: "form_fields[message]", label: "How Soon Are You Looking To Have This Cleaned?", required: true, rule: CHOICE },
  { name: "form_fields[field_1872bc3]", label: "What’s the Address of the Property?", required: true, rule: { kind: 'text', max: 300 } },
  { name: "form_fields[name]", label: "Full Name", required: true, rule: NAME },
  { name: "form_fields[field_ca2243e]", label: "Email Address", required: true, rule: EMAIL },
  { name: "form_fields[field_deeaf01]", label: "Phone Number", required: true, rule: PHONE },
  { name: "form_fields[field_1abcd81]", label: "How Would You Prefer To Be Contacted?", required: true, rule: CHOICE },
]

export const CONTACT_FIELDS: readonly LeadFormField[] = [
  { name: "form_fields[name]", label: "Name", required: false, rule: NAME },
  { name: "form_fields[email]", label: "Email", required: true, rule: EMAIL },
  { name: "form_fields[field_66433ea]", label: "Phone Number", required: false, rule: PHONE },
  { name: "form_fields[message]", label: "Are You Looking For Help With A Cleaning Project?", required: true, rule: CHOICE },
  { name: "form_fields[field_45db7dd]", label: "How Can We Help?", required: false, rule: { kind: 'text', max: 2000 } },
]

export type BrowserLimits = { maxLength?: number; min?: number; max?: number }

/** The HTML attributes that hold a field to its rule in the browser, before anything is sent. */
export function browserLimits(field: LeadFormField): BrowserLimits {
  switch (field.rule.kind) {
    case 'text':
      return { maxLength: field.rule.max }
    case 'email':
      return { maxLength: EMAIL_MAX }
    case 'count':
      return { min: field.rule.min, max: field.rule.max }
    case 'choice':
      return {}
  }
}

// the check for a filled-in value; a blank one is handled in parse() by `required`
function fieldSchema(rule: FieldRule): z.ZodType<string> {
  switch (rule.kind) {
    case 'text':
      return z.string().max(rule.max, `Please keep this under ${rule.max} characters`)
    case 'email':
      return z.string().max(EMAIL_MAX, 'Please enter a valid email address').email('Please enter a valid email address')
    case 'count': {
      const { min, max } = rule
      return z
        .string()
        .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= min && Number(v) <= max, `Please enter a whole number from ${min} to ${max}`)
    }
    case 'choice':
      // the live forms open on a "-" option; it is not an answer
      return z.string().max(CHOICE_MAX, 'Please choose an option').refine((v) => v !== '-', 'Please choose an option')
  }
}

function blankMessage(rule: FieldRule): string {
  if (rule.kind === 'choice') return 'Please choose an option'
  if (rule.kind === 'email') return 'Please enter a valid email address'
  return 'Please fill in this field'
}

function str(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function parse(
  form: FormData,
  fields: readonly LeadFormField[],
  nameKey: string,
  emailKey: string,
  phoneKey: string,
): ParseResult {
  const values: Record<string, string> = {}
  const fieldErrors: Record<string, string> = {}
  for (const field of fields) {
    const value = str(form, field.name)
    values[field.name] = value
    if (value === '') {
      // the server is never stricter than the markup: a blank optional field passes
      if (field.required) fieldErrors[field.name] = blankMessage(field.rule)
      continue
    }
    const result = fieldSchema(field.rule).safeParse(value)
    if (!result.success) fieldErrors[field.name] = result.error.issues[0]?.message ?? 'Please check this field'
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }

  const payload: Record<string, string> = {}
  for (const field of fields) payload[field.label] = values[field.name]

  // blank optional -> null; the dashboard's fallbacks key off null
  const orNull = (key: string) => (values[key] === '' ? null : values[key])
  return { ok: true, fields: { name: orNull(nameKey), email: orNull(emailKey), phone: orNull(phoneKey), payload } }
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
