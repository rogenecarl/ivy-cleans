// tests/unit/leads/leads-email.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { buildLeadEmail } from '@/server/leads/email'
import { sendLeadEmail, stubbedEmails } from '@/server/leads/mailer'
import type { LeadInput } from '@/server/leads/types'

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
    expect(mail.subject).toBe('[Ivy Cleans Miami] New booking request — Dana Whitfield')
  })

  it('uses different wording for a contact submission', () => {
    const mail = buildLeadEmail({
      cityName: 'Houston',
      lead: { ...lead, formType: 'contact', name: 'Marcus Reed' },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).toBe('[Ivy Cleans Houston] New contact message — Marcus Reed')
  })

  it('falls back when there is no name', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: { ...lead, name: null },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).toBe('[Ivy Cleans Miami] New booking request')
  })

  it('opens both bodies with the site the lead came from', () => {
    const mail = buildLeadEmail({ cityName: 'Minneapolis', lead, dashboardUrl: null })
    expect(mail.text.split('\n')[0]).toBe('Ivy Cleans Minneapolis')
    expect(mail.text).toContain('New booking request from the Ivy Cleans Minneapolis website.')
    expect(mail.html).toContain('>Ivy Cleans Minneapolis</h1>')
  })

  it('marks a booking and a contact message with different badges', () => {
    const b = buildLeadEmail({ cityName: 'Minneapolis', lead, dashboardUrl: null })
    const c = buildLeadEmail({ cityName: 'Minneapolis', lead: { ...lead, formType: 'contact' }, dashboardUrl: null })
    expect(b.html).toContain('New Booking Request')
    expect(c.html).toContain('New Contact Message')
    expect(c.html).not.toContain('New Booking Request')
  })

  it('makes the phone and email tappable and the address a map link', () => {
    const mail = buildLeadEmail({
      cityName: 'Minneapolis',
      lead: { ...lead, payload: { ...lead.payload, 'What’s the Address of the Property?': '1 Main St, Minneapolis' } },
      dashboardUrl: null,
    })
    expect(mail.html).toContain('href="tel:3055550184"')
    expect(mail.html).toContain('href="mailto:dana@example.com"')
    expect(mail.html).toContain('google.com/maps/search/?api=1&amp;query=1%20Main%20St%2C%20Minneapolis')
  })

  it('shows when the lead came in, in Minneapolis time', () => {
    const mail = buildLeadEmail({ cityName: 'Minneapolis', lead, dashboardUrl: null, submittedAt: new Date('2026-11-24T23:57:00Z') })
    expect(mail.text).toContain("Submitted Tuesday, November 24, 2026 at 5:57 PM CST")
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

  it('includes the dashboard link in both bodies when one is given', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead,
      dashboardUrl: 'https://x/admin/leads/abc',
    })
    expect(mail.html).toContain('https://x/admin/leads/abc')
    expect(mail.html).toContain('Open in dashboard')
    expect(mail.text).toContain('https://x/admin/leads/abc')
  })

  it('renders no dashboard link in either body when dashboardUrl is null, and leaks no undefined/null', () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: null })
    expect(mail.html).not.toContain('Open in dashboard')
    expect(mail.html).not.toMatch(/href="(?!mailto:|tel:)/)
    expect(mail.html).not.toContain('undefined')
    expect(mail.html).not.toContain('null')
    expect(mail.text).not.toContain('undefined')
    expect(mail.text).not.toContain('null')
    expect(mail.text).toContain('Open the dashboard to see this lead.')
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
    // the submitted value never starts a line of its own: only the real dashboard line does
    expect(lines.filter((line) => line.startsWith('Open in dashboard:'))).toEqual(['Open in dashboard: https://x'])
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
    // the submitted value never starts a line of its own: only the real dashboard line does
    expect(lines.filter((line) => line.startsWith('Open in dashboard:'))).toEqual(['Open in dashboard: https://x'])
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
    expect(mail.subject).toBe('[Ivy Cleans Miami] New booking request — Dana Bcc: attacker@evil.example')
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
