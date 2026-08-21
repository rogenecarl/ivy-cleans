// tests/leads-env.test.ts
/*
 * The three environment variables of the leads feature had three different
 * absent-vs-empty semantics, and two of them were dangerous:
 *
 *   IP_HASH_SALT     blank -> '' -> hashIp threw -> EVERY submission in
 *                    production returned a storage error. Absent -> hashed
 *                    real customer IPs with a fallback string committed to
 *                    this repository.
 *   LEADS_FROM_EMAIL blank -> `from: ''` -> every notification failed.
 *   LEADS_DASHBOARD_ORIGIN  correct by accident (truthiness).
 *
 * src/leads/env.ts resolves all three in one place with one rule. These tests
 * pin that rule, because the whole failure mode was that nobody could tell
 * the three apart by reading the call sites.
 *
 * The module reads process.env at IMPORT time (once per process, not per
 * request), so each case re-imports it with vi.resetModules().
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const KEYS = ['IP_HASH_SALT', 'LEADS_FROM_EMAIL', 'LEADS_DASHBOARD_ORIGIN', 'STUB_EMAIL', 'RESEND_API_KEY']
const original: Record<string, string | undefined> = {}
for (const key of KEYS) original[key] = process.env[key]

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key]
    else process.env[key] = original[key]
  }
  vi.resetModules()
})

async function loadEnv(values: Record<string, string>) {
  for (const key of KEYS) delete process.env[key]
  Object.assign(process.env, values)
  vi.resetModules()
  return import('../src/leads/env')
}

describe('leads environment resolution', () => {
  it('treats an absent variable and a blank one identically, for all three', async () => {
    const absent = await loadEnv({})
    const blank = await loadEnv({
      IP_HASH_SALT: '',
      LEADS_FROM_EMAIL: '   ',
      LEADS_DASHBOARD_ORIGIN: '\t',
    })
    expect(absent.IP_HASH_SALT).toBeNull()
    expect(absent.LEADS_FROM_EMAIL).toBeNull()
    expect(absent.LEADS_DASHBOARD_ORIGIN).toBeNull()
    expect(blank.IP_HASH_SALT).toBe(absent.IP_HASH_SALT)
    expect(blank.LEADS_FROM_EMAIL).toBe(absent.LEADS_FROM_EMAIL)
    expect(blank.LEADS_DASHBOARD_ORIGIN).toBe(absent.LEADS_DASHBOARD_ORIGIN)
  })

  it('trims a configured value', async () => {
    const env = await loadEnv({ IP_HASH_SALT: '  pepper  ' })
    expect(env.IP_HASH_SALT).toBe('pepper')
  })

  it('carries no committed fallback for the salt', async () => {
    // The old code fell back to the literal 'unsalted-dev-only', which is
    // public in this repository: every deployment that forgot the variable
    // hashed real IP addresses with a value anyone can read.
    // Asserted on the RESOLVED value, not by scanning the source: null here
    // is the only thing that guarantees no string can be silently substituted
    // for a real salt.
    const env = await loadEnv({})
    expect(env.IP_HASH_SALT).toBeNull()
    expect(typeof env.IP_HASH_SALT).not.toBe('string')
  })
})

describe('sendLeadEmail with a missing LEADS_FROM_EMAIL', () => {
  it('reports the real reason instead of sending from an empty address', async () => {
    // STUB_EMAIL and RESEND_API_KEY are both cleared, so nothing can reach the
    // provider: this returns before either the stub sink or the Resend import.
    for (const key of KEYS) delete process.env[key]
    vi.resetModules()
    const { buildLeadEmail } = await import('../src/leads/email')
    const { sendLeadEmail } = await import('../src/leads/mailer')
    const email = buildLeadEmail({
      cityName: 'Miami',
      lead: {
        cityKey: 'miami',
        formType: 'contact',
        name: 'Dana',
        email: 'dana@example.com',
        phone: null,
        payload: {},
        isTest: false,
        ipHash: null,
      },
      dashboardUrl: null,
    })
    const result = await sendLeadEmail({ to: ['ops@example.com'], replyTo: null, email })
    expect(result).toEqual({ ok: false, error: 'LEADS_FROM_EMAIL is not set' })
  })
})
