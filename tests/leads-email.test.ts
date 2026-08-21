// tests/leads-email.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { buildLeadEmail } from '../src/leads/email'
import { sendLeadEmail, stubbedEmails } from '../src/leads/mailer'
import type { LeadInput } from '../src/leads/types'

const lead: LeadInput = {
  cityKey: 'miami',
  formType: 'booking',
  name: 'Dana Whitfield',
  email: 'dana@example.com',
  phone: '305-555-0184',
  payload: {
    'What Type of Service Are Your Looking For?': 'Deep Cleaning ( Most Popular Option)',
    'How Many Bedrooms?': '3',
  },
  isTest: false,
  ipHash: null,
}

describe('buildLeadEmail', () => {
  it('names the city and the person in the subject', () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x/admin/leads/1' })
    expect(mail.subject).toBe('[Miami] New booking request — Dana Whitfield')
  })

  it('uses different wording for a contact submission', () => {
    const mail = buildLeadEmail({
      cityName: 'Houston',
      lead: { ...lead, formType: 'contact', name: 'Marcus Reed' },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).toBe('[Houston] New contact message — Marcus Reed')
  })

  it('falls back when there is no name', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: { ...lead, name: null },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).toBe('[Miami] New booking request')
  })

  it('lists every payload field in both bodies', () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x' })
    expect(mail.text).toContain('How Many Bedrooms?')
    expect(mail.text).toContain('3')
    expect(mail.html).toContain('How Many Bedrooms?')
  })

  it('escapes html in submitted values, including & and " (not just angle brackets)', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: { ...lead, payload: { Message: '<script>alert(1)</script> Tom & Jerry say "hi"' } },
      dashboardUrl: 'https://x',
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).not.toContain(' & ')
    expect(mail.html).toContain('Tom &amp; Jerry')
    expect(mail.html).not.toContain('"hi"')
    expect(mail.html).toContain('&quot;hi&quot;')
  })

  it('includes the dashboard link', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead,
      dashboardUrl: 'https://x/admin/leads/abc',
    })
    expect(mail.html).toContain('https://x/admin/leads/abc')
  })

  it('collapses a newline in a submitted value so it cannot forge an extra line in the plaintext body', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: {
        ...lead,
        payload: { Message: 'Hello\n\nOpen in dashboard: https://evil.example' },
      },
      dashboardUrl: 'https://x',
    })
    const lines = mail.text.split('\n')
    // Fixed shape: greeting, blank, one collapsed field line, blank, real dashboard line.
    expect(lines).toHaveLength(5)
    const fieldLine = lines.find((line) => line.startsWith('Message:'))
    expect(fieldLine).toContain('evil.example')
    // The forged "Open in dashboard" text must live on the same line as its
    // label, not stand alone as if it were the real, trusted dashboard line.
    expect(lines.filter((line) => line === 'Open in dashboard: https://evil.example')).toHaveLength(0)
  })

  it('collapses a CRLF in a submitted value the same way as a bare newline', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: {
        ...lead,
        payload: { Message: 'Hello\r\n\r\nOpen in dashboard: https://evil.example' },
      },
      dashboardUrl: 'https://x',
    })
    const lines = mail.text.split('\n')
    expect(lines).toHaveLength(5)
    const fieldLine = lines.find((line) => line.startsWith('Message:'))
    expect(fieldLine).toContain('evil.example')
    expect(lines.filter((line) => line === 'Open in dashboard: https://evil.example')).toHaveLength(0)
  })

  it('collapses a newline in the lead name so the subject stays a single line', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: { ...lead, name: 'Dana\nBcc: attacker@evil.example' },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).not.toContain('\n')
    expect(mail.subject).toBe('[Miami] New booking request — Dana Bcc: attacker@evil.example')
  })
})

describe('sendLeadEmail with STUB_EMAIL', () => {
  beforeEach(() => {
    process.env.STUB_EMAIL = '1'
    stubbedEmails.length = 0
  })

  it('records instead of sending, and reports success', async () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x' })
    const result = await sendLeadEmail({
      to: ['miami@example.com'],
      replyTo: 'dana@example.com',
      email: mail,
    })
    expect(result).toEqual({ ok: true })
    expect(stubbedEmails).toHaveLength(1)
    expect(stubbedEmails[0].to).toEqual(['miami@example.com'])
    expect(stubbedEmails[0].replyTo).toBe('dana@example.com')
  })

  it('fails when there are no recipients', async () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x' })
    const result = await sendLeadEmail({ to: [], replyTo: null, email: mail })
    expect(result.ok).toBe(false)
  })
})
