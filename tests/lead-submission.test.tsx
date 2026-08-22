/*
 * The Leads screen's one job, as a test: show the operator EVERYTHING the
 * customer submitted.
 *
 * This is the regression guard for a specific, silent failure. The submission
 * view used to iterate `lead.payload`, which only ever contains questions the
 * customer actually answered -- so a skipped optional question simply vanished
 * from the screen, and "they left the phone number blank" looked identical to
 * "we never asked for a phone number". Driving the render from
 * BOOKING_FIELDS/CONTACT_FIELDS instead is what fixes that, and these tests
 * fail if anyone reverts to walking the payload.
 *
 * renderToStaticMarkup in plain node is enough: LeadSubmission has no hooks
 * and no client-only APIs.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LeadSubmission, leadHeadline } from '@/app/admin-x7kq92mpfw4rt8vz/leads/lead-submission'
import { BOOKING_FIELDS, CONTACT_FIELDS } from '@/leads/schema'
import type { LeadRecord } from '@/leads/types'

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: 'lead-1',
    cityKey: 'minneapolis',
    formType: 'booking',
    name: 'Jane Rivera',
    email: 'jane@example.com',
    phone: '612-555-0148',
    payload: {},
    status: 'new',
    notes: '',
    emailStatus: 'sent',
    emailError: null,
    isTest: false,
    ipHash: null,
    submittedAt: new Date('2026-08-22T12:00:00Z'),
    updatedAt: new Date('2026-08-22T12:00:00Z'),
    ...overrides,
  }
}

/** Undo the HTML entities renderToStaticMarkup emits, so assertions can be
 * written with the same apostrophes and ampersands the form labels use. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
}

describe('LeadSubmission', () => {
  it('renders every booking question even when the payload is completely empty', () => {
    const markup = text(renderToStaticMarkup(<LeadSubmission lead={lead({ payload: {} })} />))
    for (const field of BOOKING_FIELDS) {
      expect(markup, `missing question: ${field.label}`).toContain(field.label)
    }
    // Every one of them is unanswered, so the operator is told so in words
    // rather than being shown a shorter form.
    expect(markup.match(/Not answered/g)).toHaveLength(BOOKING_FIELDS.length)
  })

  it('renders every contact question even when the payload is completely empty', () => {
    const markup = text(
      renderToStaticMarkup(<LeadSubmission lead={lead({ formType: 'contact', payload: {} })} />),
    )
    for (const field of CONTACT_FIELDS) {
      expect(markup, `missing question: ${field.label}`).toContain(field.label)
    }
  })

  it('shows a skipped optional answer as unanswered instead of dropping the question', () => {
    // The contact form's phone number is optional -- the exact case that used
    // to disappear from the screen entirely.
    const phone = CONTACT_FIELDS.find((f) => f.label === 'Phone Number')
    expect(phone?.required).toBe(false)

    const markup = text(
      renderToStaticMarkup(
        <LeadSubmission
          lead={lead({
            formType: 'contact',
            payload: { Name: 'Marcus Bell', 'Phone Number': '' },
          })}
        />,
      ),
    )
    expect(markup).toContain('Phone Number')
    expect(markup).toContain('Not answered')
    expect(markup).toContain('Marcus Bell')
  })

  it('keeps the questions in the order the form asked them', () => {
    const markup = text(renderToStaticMarkup(<LeadSubmission lead={lead({ payload: {} })} />))
    const positions = BOOKING_FIELDS.map((f) => markup.indexOf(f.label))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('renders a payload key the form definition does not know about', () => {
    // A form that gains a field before schema.ts learns of it must still show
    // the answer, rather than silently discarding what the customer typed.
    const markup = text(
      renderToStaticMarkup(
        <LeadSubmission lead={lead({ payload: { 'Gate code': '#4417' } })} />,
      )
    )
    expect(markup).toContain('Gate code')
    expect(markup).toContain('#4417')
  })

  it('makes phone and email answers clickable, and leaves the address as text', () => {
    const markup = renderToStaticMarkup(
      <LeadSubmission
        lead={lead({
          payload: {
            'Phone Number': '612-555-0148',
            'Email Address': 'jane@example.com',
            'What’s the Address of the Property?': '4412 Girard Ave S',
          },
        })}
      />,
    )
    expect(markup).toContain('href="tel:6125550148"')
    expect(markup).toContain('href="mailto:jane@example.com"')
    expect(markup).not.toContain('href="4412')
  })
})

describe('leadHeadline', () => {
  it('is the first booking question’s answer', () => {
    const headline = leadHeadline(
      lead({ payload: { [BOOKING_FIELDS[0].label]: 'Deep Cleaning (Most Popular)' } }),
    )
    expect(headline).toBe('Deep Cleaning (Most Popular)')
  })

  it('is null rather than an empty string when nothing was answered', () => {
    expect(leadHeadline(lead({ payload: {} }))).toBeNull()
    expect(leadHeadline(lead({ payload: { [BOOKING_FIELDS[0].label]: '   ' } }))).toBeNull()
  })
})
