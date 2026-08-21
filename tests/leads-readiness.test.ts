// tests/leads-readiness.test.ts
import { describe, expect, it } from 'vitest'
import { domainFor, siteReadiness, type DomainsIndex } from '../src/leads/readiness'

const counts = { total: 0, unworked: 0, emailFailed: 0 }

describe('siteReadiness', () => {
  it('is ready when live, domain mapped and an inbox is set', () => {
    expect(
      siteReadiness({ isLive: true, domain: 'miamicleans.com', notifyEmails: ['a@b.c'], counts }),
    ).toEqual({ ready: true, problems: [], domain: 'miamicleans.com' })
  })

  it('reports a missing domain', () => {
    const result = siteReadiness({ isLive: true, domain: null, notifyEmails: ['a@b.c'], counts })
    expect(result.ready).toBe(false)
    expect(result.problems).toContain('no-domain')
  })

  it('reports a missing inbox', () => {
    const result = siteReadiness({
      isLive: true,
      domain: 'miamicleans.com',
      notifyEmails: [],
      counts,
    })
    expect(result.problems).toContain('no-inbox')
  })

  it('reports failed deliveries', () => {
    const result = siteReadiness({
      isLive: true,
      domain: 'miamicleans.com',
      notifyEmails: ['a@b.c'],
      counts: { total: 3, unworked: 1, emailFailed: 2 },
    })
    expect(result.problems).toContain('email-failures')
  })

  it('does not flag a draft site for having no domain', () => {
    const result = siteReadiness({ isLive: false, domain: null, notifyEmails: [], counts })
    expect(result.problems).toEqual([])
    expect(result.ready).toBe(true)
  })

  it('accumulates several problems at once', () => {
    const result = siteReadiness({
      isLive: true,
      domain: null,
      notifyEmails: [],
      counts: { total: 1, unworked: 1, emailFailed: 1 },
    })
    expect(result.problems.sort()).toEqual(['email-failures', 'no-domain', 'no-inbox'])
  })
})

describe('domainFor', () => {
  it('returns the mapped host for a city with a hosts entry', () => {
    const domains: DomainsIndex = {
      default: 'minneapolis',
      hosts: { 'miamicleans.com': 'miami' },
    }
    expect(domainFor('miami', domains)).toBe('miamicleans.com')
  })

  it('returns null for a city that is neither mapped nor the default', () => {
    const domains: DomainsIndex = { default: 'minneapolis', hosts: {} }
    expect(domainFor('miami', domains)).toBeNull()
  })

  it('prefers an explicit host mapping over the default flag', () => {
    const domains: DomainsIndex = {
      default: 'miami',
      hosts: { 'miamicleans.com': 'miami' },
    }
    expect(domainFor('miami', domains)).toBe('miamicleans.com')
  })

  // RULING 1: pins the exact production case. content/_domains.json today is
  // { default: "minneapolis", hosts: {} } -- the only LIVE city has no hosts
  // entry at all, so it must still count as having a domain.
  it('treats the default city as reachable with an empty hosts map', () => {
    const domains: DomainsIndex = { default: 'minneapolis', hosts: {} }
    expect(domainFor('minneapolis', domains)).not.toBeNull()
  })
})

describe('siteReadiness + domainFor (ruling 1 integration)', () => {
  it('does not report no-domain for the default city with an empty hosts map', () => {
    const domains: DomainsIndex = { default: 'minneapolis', hosts: {} }
    const result = siteReadiness({
      isLive: true,
      domain: domainFor('minneapolis', domains),
      notifyEmails: ['a@b.c'],
      counts,
    })
    expect(result.problems).not.toContain('no-domain')
    expect(result.ready).toBe(true)
  })
})
