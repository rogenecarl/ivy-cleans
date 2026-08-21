// tests/leads-attribution.test.ts
/*
 * attributeCity answers ONE question: whose lead is this?
 *
 * It used to answer a second one — is this a draft preview? — from the same
 * evidence, and got it catastrophically wrong: with content/_domains.json
 * mapping no hosts at all, every real customer of every non-default city was
 * filed as a test row, hidden from all three dashboard screens and never
 * emailed. Whether a lead is a preview is now decided by the CITY'S OWN
 * status, through submit.ts's isDraftCity port (see tests/leads-submit.test.ts).
 *
 * These tests therefore assert attribution only, plus the fact that this
 * function no longer classifies at all.
 */
import { describe, expect, it } from 'vitest'
import { attributeCity } from '../src/leads/attribution'
import type { DomainsIndex } from '../src/content/resolve-rewrite'

const domains: DomainsIndex = {
  default: 'minneapolis',
  hosts: { 'miamicleans.com': 'miami', 'houstoncleans.com': 'houston' },
}

describe('attributeCity', () => {
  it('uses the mapped city for a tenant domain', () => {
    expect(attributeCity('miamicleans.com', 'anything', domains)).toEqual({
      cityKey: 'miami',
      hostMapped: true,
    })
  })

  it('ignores the rendered key entirely when the host is mapped', () => {
    // The browser-supplied key is untrusted; a mapped Host cannot be forged,
    // so it must win outright. This is the part of the old behaviour that was
    // correct and is deliberately unchanged.
    expect(attributeCity('houstoncleans.com', 'miami', domains)).toEqual({
      cityKey: 'houston',
      hostMapped: true,
    })
  })

  it('lowercases the host and strips the port', () => {
    expect(attributeCity('MiamiCleans.com:3000', 'x', domains)).toEqual({
      cityKey: 'miami',
      hostMapped: true,
    })
  })

  it('falls back to the rendered key when the host is not mapped', () => {
    // The normal state of this deployment today: _domains.json maps no hosts,
    // so every city is reached at <deploy-host>/<cityKey>/... and the rendered
    // key is the only key there is.
    expect(attributeCity('ivy-cleans.vercel.app', 'miami', domains)).toEqual({
      cityKey: 'miami',
      hostMapped: false,
    })
  })

  it('attributes the default city on an unmapped host to itself', () => {
    expect(attributeCity('localhost', 'minneapolis', domains)).toEqual({
      cityKey: 'minneapolis',
      hostMapped: false,
    })
  })

  it('handles an empty host without throwing', () => {
    expect(attributeCity('', 'miami', domains)).toEqual({ cityKey: 'miami', hostMapped: false })
  })

  it('does not classify the lead: no isTest anywhere in its answer', () => {
    // The regression guard. If a future edit reintroduces an isTest here, it
    // is answering the draft-preview question from the request shape again —
    // which is exactly how a live city's real customers went unanswered.
    for (const host of ['miamicleans.com', 'localhost', '']) {
      expect(attributeCity(host, 'miami', domains)).not.toHaveProperty('isTest')
    }
  })
})
