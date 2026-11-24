// tests/unit/admin/sites-admin-ui.test.ts
/*
 * Pure decisions behind the per-city settings screen, tested where they
 * live: src/app/admin/(console)/sites/logic.ts. sites/actions.ts (a
 * 'use server' file) defers to this module for parsing and validation, the
 * same split tests/unit/admin/leads-admin-ui.test.ts exercises for the Leads screen.
 */
import { describe, expect, it } from 'vitest'
import { MAX_OPS_FIELD_LENGTH, parseOpsForm } from '@/app/admin/(console)/sites/logic'

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
