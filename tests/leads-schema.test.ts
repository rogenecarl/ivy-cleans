// tests/leads-schema.test.ts
import { describe, expect, it } from 'vitest'
import { HONEYPOT_FIELD, parseBookingForm, parseContactForm, BOOKING_FIELDS, CONTACT_FIELDS } from '../src/leads/schema'
import { getDefaultCity } from '../src/content/store'
import { bookData } from '../src/data/book'
import { contactData } from '../src/data/contact'

function booking(over: Record<string, string> = {}): FormData {
  const f = new FormData()
  f.set('form_fields[email]', 'Deep Cleaning ( Most Popular Option)')
  f.set('form_fields[field_22aa910]', 'Slightly Dirty (Nothing crazy)')
  f.set('form_fields[field_c4cfac1]', '3')
  f.set('form_fields[field_caacb3a]', '2')
  f.set('form_fields[message]', 'Sometime this week')
  f.set('form_fields[field_1872bc3]', '1420 Brickell Ave')
  f.set('form_fields[name]', 'Dana Whitfield')
  f.set('form_fields[field_ca2243e]', 'dana@example.com')
  f.set('form_fields[field_deeaf01]', '305-555-0184')
  f.set('form_fields[field_1abcd81]', 'Call Me')
  for (const [k, v] of Object.entries(over)) f.set(k, v)
  return f
}

function contact(over: Record<string, string> = {}): FormData {
  const f = new FormData()
  f.set('form_fields[name]', 'Alicia Gordon')
  f.set('form_fields[email]', 'alicia@example.com')
  f.set('form_fields[field_66433ea]', '(305) 555-0199')
  f.set('form_fields[message]', 'Yes')
  f.set('form_fields[field_45db7dd]', 'Weekly service for a condo in Brickell?')
  for (const [k, v] of Object.entries(over)) f.set(k, v)
  return f
}

describe('parseBookingForm', () => {
  it('lifts name, email and phone and keeps every field in the payload', () => {
    const result = parseBookingForm(booking())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.name).toBe('Dana Whitfield')
    expect(result.fields.email).toBe('dana@example.com')
    expect(result.fields.phone).toBe('305-555-0184')
    expect(result.fields.payload['What Type of Service Are Your Looking For?']).toBe(
      'Deep Cleaning ( Most Popular Option)',
    )
    expect(Object.keys(result.fields.payload)).toHaveLength(10)
  })

  it('rejects a missing name', () => {
    const result = parseBookingForm(booking({ 'form_fields[name]': '' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors['form_fields[name]']).toBeTruthy()
  })

  it('rejects a malformed email', () => {
    const result = parseBookingForm(booking({ 'form_fields[field_ca2243e]': 'not-an-email' }))
    expect(result.ok).toBe(false)
  })

  it('trims whitespace', () => {
    const result = parseBookingForm(booking({ 'form_fields[name]': '  Dana  ' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.name).toBe('Dana')
  })
})

describe('parseContactForm', () => {
  it('lifts the three identity fields and labels the payload', () => {
    const result = parseContactForm(contact())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.name).toBe('Alicia Gordon')
    expect(result.fields.phone).toBe('(305) 555-0199')
    expect(result.fields.payload['How Can We Help?']).toBe(
      'Weekly service for a condo in Brickell?',
    )
    expect(Object.keys(result.fields.payload)).toHaveLength(5)
  })

  it('accepts an empty optional phone', () => {
    const result = parseContactForm(contact({ 'form_fields[field_66433ea]': '' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.phone).toBeNull()
  })
})

describe('schema validation against live data', () => {
  it('BOOKING_FIELDS matches the actual booking form structure', async () => {
    const city = await getDefaultCity()
    const data = bookData(city)
    const bookFields = data.bookFields

    expect(BOOKING_FIELDS).toHaveLength(bookFields.length)
    expect(BOOKING_FIELDS.length).toBe(10)

    for (let i = 0; i < BOOKING_FIELDS.length; i++) {
      const [fieldName, label] = BOOKING_FIELDS[i]
      const actualField = bookFields[i]
      expect(fieldName).toBe(actualField.name)
      expect(label).toBe(actualField.label)
    }
  })

  it('CONTACT_FIELDS matches the actual contact form structure', async () => {
    const city = await getDefaultCity()
    const data = contactData(city)
    const contactFields = data.contactFields

    expect(CONTACT_FIELDS).toHaveLength(contactFields.length)
    expect(CONTACT_FIELDS.length).toBe(5)

    for (let i = 0; i < CONTACT_FIELDS.length; i++) {
      const [fieldName, label] = CONTACT_FIELDS[i]
      const actualField = contactFields[i]
      // Contact form field names are built from the id: form_fields[${field.id.replace("form-field-", "")}]
      const expectedFieldName = `form_fields[${actualField.id.replace('form-field-', '')}]`
      expect(fieldName).toBe(expectedFieldName)
      expect(label).toBe(actualField.label)
    }
  })
})

describe('honeypot', () => {
  it('exposes a field name that is not one of the real fields', () => {
    expect(HONEYPOT_FIELD).toBe('form_fields[website_url]')
    expect(booking().has(HONEYPOT_FIELD)).toBe(false)
  })
})
