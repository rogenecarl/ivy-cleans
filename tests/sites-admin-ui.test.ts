// tests/sites-admin-ui.test.ts
/*
 * Pure decisions behind the per-city settings screen, tested where they
 * live: src/app/admin-x7kq92mpfw4rt8vz/sites/logic.ts. site-actions.ts (a
 * 'use server' file) defers to this module for parsing and validation, the
 * same split tests/leads-admin-ui.test.ts exercises for the Leads screen.
 */
import { describe, expect, it } from 'vitest'
import { MAX_ENTRIES, MAX_RAW_LENGTH, parseNotifyEmails } from '../src/app/admin-x7kq92mpfw4rt8vz/sites/logic'

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
