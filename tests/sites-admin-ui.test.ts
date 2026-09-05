// tests/sites-admin-ui.test.ts
/*
 * Pure decisions behind the per-city settings screen, tested where they
 * live: src/app/admin/(console)/sites/logic.ts. site-actions.ts (a
 * 'use server' file) defers to this module for parsing and validation, the
 * same split tests/leads-admin-ui.test.ts exercises for the Leads screen.
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_ENTRIES,
  MAX_OPS_FIELD_LENGTH,
  MAX_RAW_LENGTH,
  parseNotifyEmails,
  parseOpsForm,
} from '../src/app/admin/(console)/sites/logic'

describe('parseNotifyEmails', () => {
  it('accepts a list of valid addresses', () => {
    expect(parseNotifyEmails('a@b.com\nc@d.com')).toEqual({
      ok: true,
      emails: ['a@b.com', 'c@d.com'],
      invalidCount: 0,
    })
  })

  it('counts an entry with no @ as invalid rather than dropping it silently', () => {
    const result = parseNotifyEmails('a@b.com\nnotanemail')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.emails).toEqual(['a@b.com'])
    expect(result.invalidCount).toBe(1)
  })

  it('ignores blank lines and surrounding whitespace without counting them invalid', () => {
    const result = parseNotifyEmails('  a@b.com  \n\n\n   ,  c@d.com  ')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.emails).toEqual(['a@b.com', 'c@d.com'])
    expect(result.invalidCount).toBe(0)
  })

  it('the returned invalidCount matches the number of entries actually rejected', () => {
    const result = parseNotifyEmails('a@b.com,bad1,bad2,c@d.com,bad3')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.emails).toEqual(['a@b.com', 'c@d.com'])
    expect(result.invalidCount).toBe(3)
  })

  it('rejects an absent field rather than yielding an empty list', () => {
    expect(parseNotifyEmails(null)).toEqual({ ok: false, reason: expect.any(String) })
  })

  it('rejects a non-string field the same way (e.g. a File arriving instead of text)', () => {
    const result = parseNotifyEmails(12345)
    expect(result.ok).toBe(false)
  })

  it('treats a present, empty field as legitimately clearing the list, not an error', () => {
    expect(parseNotifyEmails('')).toEqual({ ok: true, emails: [], invalidCount: 0 })
  })

  it('caps the number of entries and counts the excess as not saved', () => {
    const raw = Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => `a${i}@b.com`).join('\n')
    const result = parseNotifyEmails(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.emails.length).toBe(MAX_ENTRIES)
    expect(result.invalidCount).toBe(5)
  })

  it('bounds the raw string before splitting, so an oversized paste cannot force unbounded work', () => {
    const raw = 'a@b.com,'.repeat(2000) // far past MAX_RAW_LENGTH once joined
    expect(raw.length).toBeGreaterThan(MAX_RAW_LENGTH)
    const result = parseNotifyEmails(raw)
    expect(result.ok).toBe(true)
  })
})

describe('parseOpsForm', () => {
  const NAMES = ['zips', 'servingSince', 'crewLead', 'crewSize', 'homesCleaned', 'reviews'] as const

  function form(values: Partial<Record<(typeof NAMES)[number], string>>): FormData {
    const f = new FormData()
    for (const name of NAMES) f.set(name, values[name] ?? '')
    return f
  }

  it('reads every ops input off the form', () => {
    const r = parseOpsForm(
      form({ crewLead: ' Maria ', zips: '55401', crewSize: '4', reviews: 'Spotless. | Dan | Edina' }),
    )
    expect(r).toEqual({
      ok: true,
      fields: {
        zips: '55401',
        servingSince: '',
        crewLead: ' Maria ',
        crewSize: '4',
        homesCleaned: '',
        reviews: 'Spotless. | Dan | Edina',
      },
    })
  })

  it('treats a present, empty field as the operator clearing it', () => {
    const r = parseOpsForm(form({}))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.fields.crewLead).toBe('')
  })

  it('REJECTS an absent field rather than reading it as cleared', () => {
    /*
     * The destructive-write shape this admin already guards against in
     * parseNotifyEmails, and it bites harder here: ops facts cannot be
     * researched or regenerated, and on a live city there is no sidecar
     * left to recover them from.
     */
    const f = form({ crewLead: 'Maria' })
    f.delete('homesCleaned')
    const r = parseOpsForm(f)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('homesCleaned')
  })

  it('REJECTS a non-string field the same way (a File arriving instead of text)', () => {
    const f = form({})
    f.set('crewLead', new File(['x'], 'x.txt'))
    const r = parseOpsForm(f)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('crewLead')
  })

  it('bounds each field, so an oversized paste cannot force unbounded work', () => {
    const r = parseOpsForm(form({ reviews: 'x'.repeat(MAX_OPS_FIELD_LENGTH + 1) }))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('reviews')
  })
})
