/*
 * The Sites list's filtering and ordering.
 *
 * Same reasoning as the dashboard's tests: each of these can be wrong while
 * still rendering a perfectly plausible table. A dropped-status filter that
 * returns nothing reads as "you have no sites"; a sort that ignores problems
 * buries the one broken city under twenty healthy ones.
 */
import { describe, expect, it } from 'vitest'
import {
  filterSites,
  parseSiteQuery,
  siteFilterHref,
  siteQueryToSearch,
  siteStatusCounts,
  sortProblemsFirst,
} from '@/app/admin-x7kq92mpfw4rt8vz/sites/list-logic'

const SITES = [
  { key: 'minneapolis', city: 'Minneapolis', status: 'live' as const, domain: 'ivycleans.com' },
  { key: 'miami', city: 'Miami', status: 'live' as const, domain: null },
  { key: 'testville', city: 'Testville', status: 'draft' as const, domain: null },
]

describe('parseSiteQuery', () => {
  it('reads a known status and a trimmed search term', () => {
    expect(parseSiteQuery({ status: 'live', q: '  miami ' })).toEqual({ status: 'live', q: 'miami' })
  })

  it('DROPS an unrecognised status rather than filtering to nothing', () => {
    // A stale or hand-edited URL must show every site. An empty table reads as
    // "you have no sites", which is a worse lie than ignoring a bad parameter.
    expect(parseSiteQuery({ status: 'banana' })).toEqual({ status: null, q: '' })
  })

  it('takes the first value when a parameter repeats', () => {
    expect(parseSiteQuery({ status: ['draft', 'live'] }).status).toBe('draft')
  })
})

describe('siteQueryToSearch / siteFilterHref', () => {
  it('omits empty values so a cleared filter leaves a clean URL', () => {
    expect(siteQueryToSearch({ status: null, q: '' })).toBe('')
  })

  it('keeps the other filter when changing one', () => {
    const href = siteFilterHref({ status: 'live', q: 'mia' }, 'status', 'draft')
    expect(href).toContain('status=draft')
    expect(href).toContain('q=mia')
  })

  it('clears a filter when given null', () => {
    const href = siteFilterHref({ status: 'live', q: '' }, 'status', null)
    expect(href).not.toContain('status=')
  })
})

describe('filterSites', () => {
  it('matches on city name, url key or domain', () => {
    expect(filterSites(SITES, { status: null, q: 'minneapolis' }).map((s) => s.key)).toEqual([
      'minneapolis',
    ])
    expect(filterSites(SITES, { status: null, q: 'testville' }).map((s) => s.key)).toEqual([
      'testville',
    ])
    expect(filterSites(SITES, { status: null, q: 'ivycleans.com' }).map((s) => s.key)).toEqual([
      'minneapolis',
    ])
  })

  it('is case-insensitive', () => {
    expect(filterSites(SITES, { status: null, q: 'MIAMI' })).toHaveLength(1)
  })

  it('combines status and search', () => {
    expect(filterSites(SITES, { status: 'live', q: 'i' }).map((s) => s.key)).toEqual([
      'minneapolis',
      'miami',
    ])
  })

  it('does not crash on a site with no domain', () => {
    expect(filterSites(SITES, { status: null, q: 'nothing-matches' })).toEqual([])
  })
})

describe('siteStatusCounts', () => {
  it('includes every status, zeros included', () => {
    // A missing "error" key would render as a gap rather than a zero, reading
    // as "errors are not a thing here".
    expect(siteStatusCounts(SITES)).toEqual({
      live: 2,
      draft: 1,
      'draft-unfinalized': 0,
      generating: 0,
      error: 0,
    })
  })
})

describe('sortProblemsFirst', () => {
  it('puts sites with problems above healthy ones', () => {
    const sorted = sortProblemsFirst([
      { city: 'Alpha', problemCount: 0 },
      { city: 'Zulu', problemCount: 2 },
      { city: 'Bravo', problemCount: 1 },
    ])
    expect(sorted.map((s) => s.city)).toEqual(['Zulu', 'Bravo', 'Alpha'])
  })

  it('breaks ties alphabetically, so the order cannot change between renders', () => {
    const sorted = sortProblemsFirst([
      { city: 'Zulu', problemCount: 0 },
      { city: 'Alpha', problemCount: 0 },
    ])
    expect(sorted.map((s) => s.city)).toEqual(['Alpha', 'Zulu'])
  })

  it('does not mutate its input', () => {
    const input = [{ city: 'Zulu', problemCount: 0 }, { city: 'Alpha', problemCount: 1 }]
    sortProblemsFirst(input)
    expect(input.map((s) => s.city)).toEqual(['Zulu', 'Alpha'])
  })
})
