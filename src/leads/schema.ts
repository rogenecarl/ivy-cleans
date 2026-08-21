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

/** Live field name -> human label, in the order the form renders them. */
export const BOOKING_FIELDS: readonly [string, string][] = [
  ["form_fields[email]", "What Type of Service Are Your Looking For?"],
  ["form_fields[field_22aa910]", "How Would Your Describe Your Home Right Now?"],
  ["form_fields[field_c4cfac1]", "How Many Bedrooms?"],
  ["form_fields[field_caacb3a]", "How Many Bathrooms?"],
  ["form_fields[message]", "How Soon Are You Looking To Have This Cleaned?"],
  ["form_fields[field_1872bc3]", "What’s the Address of the Property?"],
  ["form_fields[name]", "Full Name"],
  ["form_fields[field_ca2243e]", "Email Address"],
  ["form_fields[field_deeaf01]", "Phone Number"],
  ["form_fields[field_1abcd81]", "How Would You Prefer To Be Contacted?"],
]

export const CONTACT_FIELDS: readonly [string, string][] = [
  ["form_fields[name]", "Name"],
  ["form_fields[email]", "Email"],
  ["form_fields[field_66433ea]", "Phone Number"],
  ["form_fields[message]", "Are You Looking For Help With A Cleaning Project?"],
  ["form_fields[field_45db7dd]", "How Can We Help?"],
]

const identity = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(200),
  email: z.string().trim().email('Please enter a valid email address').max(320),
  phone: z.string().trim().max(50),
})

function str(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function parse(
  form: FormData,
  fields: readonly [string, string][],
  nameKey: string,
  emailKey: string,
  phoneKey: string,
): ParseResult {
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
  for (const [key, label] of fields) payload[label] = str(form, key)

  return {
    ok: true,
    fields: {
      name: parsed.data.name,
      email: parsed.data.email,
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
