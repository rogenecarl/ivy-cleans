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
  paginate,
  sortProblemsFirst,
  visibleStatuses,
} from '@/app/admin/(console)/sites/list-logic'

const SITES = [
  { key: 'minneapolis', city: 'Minneapolis', stage: 'live' as const, domain: 'ivycleans.com' },
  { key: 'miami', city: 'Miami', stage: 'live' as const, domain: null },
  { key: 'testville', city: 'Testville', stage: 'needs-review' as const, domain: null },
]

describe('parseSiteQuery', () => {
  it('reads a known status and a trimmed search term', () => {
    expect(parseSiteQuery({ status: 'live', q: '  miami ' })).toEqual({
      status: 'live',
      q: 'miami',
      page: 1,
    })
  })

  it('DROPS an unrecognised status rather than filtering to nothing', () => {
    // A stale or hand-edited URL must show every site. An empty table reads as
    // "you have no sites", which is a worse lie than ignoring a bad parameter.
    expect(parseSiteQuery({ status: 'banana' })).toEqual({ status: null, q: '', page: 1 })
  })

  it('takes the first value when a parameter repeats', () => {
    expect(parseSiteQuery({ status: ['needs-review', 'live'] }).status).toBe('needs-review')
  })
})

describe('siteQueryToSearch / siteFilterHref', () => {
  it('omits empty values so a cleared filter leaves a clean URL', () => {
    expect(siteQueryToSearch({ status: null, q: '', page: 1 })).toBe('')
  })

  it('keeps the other filter when changing one', () => {
    const href = siteFilterHref({ status: 'live', q: 'mia', page: 1 }, 'status', 'ready')
    expect(href).toContain('status=ready')
    expect(href).toContain('q=mia')
  })

  it('clears a filter when given null', () => {
    const href = siteFilterHref({ status: 'live', q: '', page: 1 }, 'status', null)
    expect(href).not.toContain('status=')
  })
})

describe('filterSites', () => {
  it('matches on city name, url key or domain', () => {
    expect(filterSites(SITES, { status: null, q: 'minneapolis', page: 1 }).map((s) => s.key)).toEqual([
      'minneapolis',
    ])
    expect(filterSites(SITES, { status: null, q: 'testville', page: 1 }).map((s) => s.key)).toEqual([
      'testville',
    ])
    expect(filterSites(SITES, { status: null, q: 'ivycleans.com', page: 1 }).map((s) => s.key)).toEqual([
      'minneapolis',
    ])
  })

  it('is case-insensitive', () => {
    expect(filterSites(SITES, { status: null, q: 'MIAMI', page: 1 })).toHaveLength(1)
  })

  it('combines status and search', () => {
    expect(filterSites(SITES, { status: 'live', q: 'i', page: 1 }).map((s) => s.key)).toEqual([
      'minneapolis',
      'miami',
    ])
  })

  it('does not crash on a site with no domain', () => {
    expect(filterSites(SITES, { status: null, q: 'nothing-matches', page: 1 })).toEqual([])
  })
})

describe('siteStatusCounts', () => {
  it('includes every stage, zeros included', () => {
    expect(siteStatusCounts(SITES)).toEqual({ generating: 0, stopped: 0, 'needs-review': 1, ready: 0, live: 2 })
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

describe('visibleStatuses', () => {
  const healthy = { generating: 0, stopped: 0, 'needs-review': 1, ready: 0, live: 3 }

  it('always shows Needs review and Live, and hides the rest at zero', () => {
    expect(visibleStatuses(healthy, null)).toEqual(['needs-review', 'live'])
    expect(visibleStatuses({ ...healthy, live: 0, 'needs-review': 0 }, null)).toEqual(['needs-review', 'live'])
  })

  it('surfaces a stage the moment it has something in it, in pipeline order', () => {
    expect(visibleStatuses({ ...healthy, stopped: 1, ready: 2 }, null)).toEqual(['stopped', 'needs-review', 'ready', 'live'])
  })

  it('keeps a SELECTED stage visible at zero, so the filter can be undone', () => {
    expect(visibleStatuses(healthy, 'generating')).toEqual(['generating', 'needs-review', 'live'])
  })
})

describe('pagination', () => {
  const rows = Array.from({ length: 125 }, (_, i) => i)

  it('reports the range the way the footer prints it', () => {
    const p = paginate(rows, 1, 50)
    expect([p.from, p.to, p.total, p.pageCount]).toEqual([1, 50, 125, 3])
    expect(p.items).toHaveLength(50)
  })

  it('gets the short last page right', () => {
    const p = paginate(rows, 3, 50)
    expect([p.from, p.to]).toEqual([101, 125])
    expect(p.items).toHaveLength(25)
  })

  it('CLAMPS a page past the end instead of showing an empty list', () => {
    // Rows can vanish between the URL being built and the page rendering.
    // Slicing past the end would render "no sites match these filters".
    const p = paginate(rows, 99, 50)
    expect(p.page).toBe(3)
    expect(p.items).toHaveLength(25)
  })

  it('clamps a page below 1', () => {
    expect(paginate(rows, 0, 50).page).toBe(1)
    expect(paginate(rows, -5, 50).page).toBe(1)
  })

  it('reports 0-0 for an empty list, not 1-0', () => {
    const p = paginate([], 1, 50)
    expect([p.from, p.to, p.total, p.pageCount]).toEqual([0, 0, 0, 1])
  })
})

describe('page in the query string', () => {
  it('keeps page 1 out of the URL', () => {
    expect(siteQueryToSearch({ status: null, q: '', page: 1 })).toBe('')
  })

  it('RESETS to page 1 when a filter changes', () => {
    // Narrowing 200 sites to 3 while on page 4 would otherwise land on an
    // empty page reading "no sites match" -- the filter looks broken when it
    // worked perfectly.
    const href = siteFilterHref({ status: null, q: '', page: 4 }, 'status', 'live')
    expect(href).not.toContain('page=')
    const searched = siteFilterHref({ status: null, q: '', page: 4 }, 'q', 'miami')
    expect(searched).not.toContain('page=')
  })

  it('keeps the filters when changing page', () => {
    const href = siteFilterHref({ status: 'live', q: 'mia', page: 1 }, 'page', '3')
    expect(href).toContain('page=3')
    expect(href).toContain('status=live')
    expect(href).toContain('q=mia')
  })

  it('falls back to page 1 on a mangled page parameter', () => {
    // NaN would slice to an empty array and read as "the list is empty".
    expect(parseSiteQuery({ page: 'banana' }).page).toBe(1)
    expect(parseSiteQuery({ page: '0' }).page).toBe(1)
    expect(parseSiteQuery({ page: '2.5' }).page).toBe(1)
  })
})
