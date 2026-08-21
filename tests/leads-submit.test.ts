// tests/leads-submit.test.ts
import { describe, expect, it } from 'vitest'
import { submitLead, type SubmitPorts } from '../src/leads/submit'
import type { DomainsIndex } from '../src/content/resolve-rewrite'
import type { LeadInput, LeadRecord } from '../src/leads/types'

const domains: DomainsIndex = { default: 'minneapolis', hosts: { 'miamicleans.com': 'miami' } }

/*
 * CORRECTED 2026-08-21 after the Task 2 review. These are the field names the
 * booking form ACTUALLY submits, read from src/data/book.ts:128-262. Note that
 * `form_fields[email]` is the SERVICE-TYPE DROPDOWN on this form, not an email
 * address -- Elementor reused the slot. The real email is
 * `form_fields[field_ca2243e]` and the real phone is
 * `form_fields[field_deeaf01]`.
 */
function bookingForm(over: Record<string, string> = {}): FormData {
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

type Call = string

function ports(over: Partial<SubmitPorts> = {}): { ports: SubmitPorts; calls: Call[] } {
  const calls: Call[] = []
  const base: SubmitPorts = {
    async countRecentByIpHash() {
      calls.push('count')
      return 0
    },
    async createLead(input: LeadInput) {
      calls.push('create')
      return { ...input, id: 'lead-1', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() } satisfies LeadRecord
    },
    async markLeadEmail(_id, status) {
      calls.push(`mark:${status}`)
    },
    async getSiteSettings() {
      calls.push('settings')
      return { cityKey: 'miami', notifyEmails: ['miami@example.com'] }
    },
    async sendEmail() {
      calls.push('send')
      return { ok: true }
    },
    cityNameFor: async () => 'Miami',
    dashboardUrlFor: (id) => `https://x/admin/leads/${id}`,
  }
  return { ports: { ...base, ...over }, calls }
}

const args = (form: FormData, over = {}) => ({
  form,
  formType: 'booking' as const,
  host: 'miamicleans.com',
  renderedCityKey: 'miami',
  clientIp: '203.0.113.7',
  ipSalt: 'pepper',
  domains,
  ...over,
})

describe('submitLead', () => {
  it('saves the lead and reports success', async () => {
    const { ports: p } = ports()
    const result = await submitLead(args(bookingForm()), p)
    expect(result).toEqual({ ok: true, leadId: 'lead-1' })
  })

  it('creates the lead BEFORE attempting the email', async () => {
    const { ports: p, calls } = ports()
    await submitLead(args(bookingForm()), p)
    expect(calls.indexOf('create')).toBeLessThan(calls.indexOf('send'))
  })

  it('still succeeds, and flags the row, when the email fails', async () => {
    const { ports: p, calls } = ports({
      async sendEmail() {
        return { ok: false, error: 'domain not verified' }
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result).toEqual({ ok: true, leadId: 'lead-1' })
    expect(calls).toContain('mark:failed')
  })

  it('still succeeds, and flags the row, when the mailer throws', async () => {
    const { ports: p, calls } = ports({
      async sendEmail() {
        throw new Error('socket hang up')
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result.ok).toBe(true)
    expect(calls).toContain('mark:failed')
  })

  it('does not relabel a genuinely successful send as failed when recording it throws', async () => {
    const { ports: p, calls } = ports({
      async markLeadEmail(_id, status) {
        calls.push(`mark:${status}`)
        if (status === 'sent') throw new Error('write conflict')
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result).toEqual({ ok: true, leadId: 'lead-1' })
    expect(calls).toContain('mark:sent')
    expect(calls).not.toContain('mark:failed')
  })

  it('marks skipped and sends nothing when the city has no inbox', async () => {
    const { ports: p, calls } = ports({ async getSiteSettings() { return null } })
    await submitLead(args(bookingForm()), p)
    expect(calls).toContain('mark:skipped')
    expect(calls).not.toContain('send')
  })

  it('marks sent on success', async () => {
    const { ports: p, calls } = ports()
    await submitLead(args(bookingForm()), p)
    expect(calls).toContain('mark:sent')
  })

  it('attributes a preview submission as a test row and sends no email', async () => {
    const { ports: p, calls } = ports()
    let captured: LeadInput | null = null
    p.createLead = async (input) => {
      captured = input
      return { ...input, id: 'lead-2', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() }
    }
    await submitLead(args(bookingForm(), { host: 'localhost', renderedCityKey: 'testville' }), p)
    expect(captured!.isTest).toBe(true)
    expect(captured!.cityKey).toBe('testville')
    expect(calls).not.toContain('send')
  })

  it('returns field errors and writes nothing when validation fails', async () => {
    const { ports: p, calls } = ports()
    const result = await submitLead(args(bookingForm({ 'form_fields[field_ca2243e]': 'bad' })), p)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('validation')
    expect(calls).not.toContain('create')
  })

  it('returns success but writes nothing when the honeypot is filled', async () => {
    const { ports: p, calls } = ports()
    const form = bookingForm()
    form.set('form_fields[website_url]', 'http://spam.example')
    const result = await submitLead(args(form), p)
    expect(result.ok).toBe(true)
    expect(calls).not.toContain('create')
  })

  it('never queries the rate limit when the honeypot is filled', async () => {
    const { ports: p, calls } = ports()
    const form = bookingForm()
    form.set('form_fields[website_url]', 'http://spam.example')
    await submitLead(args(form), p)
    expect(calls.filter((c) => c === 'count')).toHaveLength(0)
  })

  it('rejects when rate limited', async () => {
    const { ports: p, calls } = ports({ async countRecentByIpHash() { return 99 } })
    const result = await submitLead(args(bookingForm()), p)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('rate-limit')
    expect(calls).not.toContain('create')
  })

  it('reports a storage error when the insert throws', async () => {
    const { ports: p } = ports({
      async createLead() {
        throw new Error('connection refused')
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('storage')
  })

  it('rejects (does not resolve a SubmitResult) when ipSalt is empty', async () => {
    // hashIp throws on a misconfigured (empty/whitespace-only) salt rather than
    // silently storing a reversible hash. submitLead deliberately does not
    // catch that throw, so the promise itself rejects. The caller (the next
    // task's server action / route handler) is responsible for catching this
    // and returning a graceful failure to the customer -- letting it through
    // unhandled would otherwise surface as a raw 500 on a real submission.
    const { ports: p } = ports()
    await expect(submitLead(args(bookingForm(), { ipSalt: '' }), p)).rejects.toThrow(
      'IP_HASH_SALT',
    )
  })
})
