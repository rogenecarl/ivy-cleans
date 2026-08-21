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

/*
 * `draftCities` is the whole point of the isDraftCity port: a lead is a test
 * row when THE CITY IS A DRAFT, never because of the host it arrived on. The
 * default set marks only 'testville' a draft, so 'miami' and 'minneapolis'
 * behave as the live cities they are in content/.
 */
function ports(
  over: Partial<SubmitPorts> = {},
  draftCities: string[] = ['testville'],
): { ports: SubmitPorts; calls: Call[] } {
  const calls: Call[] = []
  const base: SubmitPorts = {
    async isDraftCity(cityKey: string) {
      calls.push(`draft?:${cityKey}`)
      return draftCities.includes(cityKey)
    },
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

  /*
   * THE C1 REGRESSION SET. isTest used to be decided by the request shape:
   * any host not in _domains.hosts, rendering any city other than the default,
   * produced a test row. _domains.hosts is EMPTY, so every real customer of
   * every non-default city was silently filed as test data -- never emailed,
   * filtered out of the leads list and the per-city counts, with no control on
   * any screen to reveal them. These three cases pin the corrected semantics:
   * the CITY'S status decides, the host decides only the key.
   */
  it('a LIVE city on an unmapped host is a real lead: not a test row, and emailed', async () => {
    const { ports: p, calls } = ports()
    let captured: LeadInput | null = null
    p.createLead = async (input) => {
      captured = input
      return { ...input, id: 'lead-3', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() }
    }
    // Exactly the deployment this app is in today: no host mapped, the city
    // reached at <deploy-host>/miami/contact.
    await submitLead(args(bookingForm(), { host: 'ivy-cleans.vercel.app', renderedCityKey: 'miami' }), p)
    expect(captured!.cityKey).toBe('miami')
    expect(captured!.isTest).toBe(false)
    expect(calls).toContain('send')
    expect(calls).toContain('mark:sent')
  })

  it('a DRAFT city is a test row and is never emailed, however it was reached', async () => {
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
    expect(calls).toContain('mark:skipped')
  })

  it('a draft city stays a test row even on its own mapped tenant domain', async () => {
    // The mirror of the case above: a mapped host does not make a draft real,
    // just as an unmapped one no longer makes a live city fake.
    const { ports: p, calls } = ports({}, ['miami'])
    let captured: LeadInput | null = null
    p.createLead = async (input) => {
      captured = input
      return { ...input, id: 'lead-4', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() }
    }
    await submitLead(args(bookingForm()), p) // host: miamicleans.com, mapped
    expect(captured!.cityKey).toBe('miami')
    expect(captured!.isTest).toBe(true)
    expect(calls).not.toContain('send')
  })

  it('classifies by the city the HOST mapped to, not the one the browser claims', async () => {
    // houstoncleans.com is mapped to houston; the browser claims testville
    // (a draft). The mapped host wins for the key, so the draft lookup is made
    // for houston and the lead is real.
    const { ports: p } = ports()
    let captured: LeadInput | null = null
    p.createLead = async (input) => {
      captured = input
      return { ...input, id: 'lead-5', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() }
    }
    await submitLead(
      args(bookingForm(), {
        host: 'houstoncleans.com',
        renderedCityKey: 'testville',
        domains: { default: 'minneapolis', hosts: { 'houstoncleans.com': 'houston' } },
      }),
      p,
    )
    expect(captured!.cityKey).toBe('houston')
    expect(captured!.isTest).toBe(false)
  })

  it('asks about the city only after validation and the rate limit have passed', async () => {
    const { ports: p, calls } = ports()
    await submitLead(args(bookingForm({ 'form_fields[field_ca2243e]': 'bad' })), p)
    expect(calls.filter((c) => c.startsWith('draft?:'))).toHaveLength(0)
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

  /*
   * THE C2 REGRESSION SET. `ipSalt: null` is what src/leads/env.ts produces
   * for an IP_HASH_SALT that is absent OR blank -- and `IP_HASH_SALT=` in a
   * half-filled .env is the common case. That used to throw out of hashIp and
   * turn EVERY submission into a storage error, which was invisible locally
   * because `next dev` sets no forwarding headers, so clientIp is null and
   * hashIp returned before it ever looked at the salt.
   */
  it('still captures the lead when no salt is configured, storing no ipHash', async () => {
    const { ports: p, calls } = ports()
    let captured: LeadInput | null = null
    p.createLead = async (input) => {
      captured = input
      return { ...input, id: 'lead-6', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() }
    }
    const result = await submitLead(args(bookingForm(), { ipSalt: null }), p)
    expect(result).toEqual({ ok: true, leadId: 'lead-6' })
    expect(captured!.ipHash).toBeNull()
    // The rate limit degrades with it -- there is no hash to count against --
    // but the customer is captured and emailed, which is the trade being made.
    expect(calls).not.toContain('count')
    expect(calls).toContain('send')
  })

  it('still rejects a blank salt STRING, which can now only be a caller bug', async () => {
    // env.ts never produces '' (absent and blank both become null), so a blank
    // string here means someone rebuilt the salt by hand -- exactly the path
    // that must not silently produce a reversible hash.
    const { ports: p } = ports()
    await expect(submitLead(args(bookingForm(), { ipSalt: '   ' }), p)).rejects.toThrow(
      'IP_HASH_SALT',
    )
  })
})
