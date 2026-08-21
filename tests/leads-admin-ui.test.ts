// tests/leads-admin-ui.test.ts
/*
 * Pure decisions behind the Leads admin screen, tested where they live:
 * src/app/admin-x7kq92mpfw4rt8vz/leads/logic.ts. This is the module the
 * page's server component defers to for filter-link building and the
 * city-key-to-display-name lookup, so it can be exercised directly without
 * standing up Next.
 */
import { describe, expect, it } from 'vitest'
import { parseLeadQuery } from '../src/leads/filters'
import { buildCityLookup, cityDisplayName, filterHref } from '../src/app/admin-x7kq92mpfw4rt8vz/leads/logic'
import { ADMIN_BASE } from '../src/app/admin-x7kq92mpfw4rt8vz/base'

describe('filterHref', () => {
  it('changing one filter preserves the others', () => {
    const query = parseLeadQuery({ city: 'miami', status: 'contacted', form: 'booking' })
    const href = filterHref(query, 'status', 'quoted')
    const search = new URLSearchParams(href.slice(href.indexOf('?') + 1))
    expect(search.get('city')).toBe('miami')
    expect(search.get('form')).toBe('booking')
    expect(search.get('status')).toBe('quoted')
  })

  it('"All" (value null) clears only its own dimension', () => {
    const query = parseLeadQuery({ city: 'miami', status: 'contacted', form: 'booking' })
    const href = filterHref(query, 'city', null)
    const search = new URLSearchParams(href.slice(href.indexOf('?') + 1))
    expect(search.has('city')).toBe(false)
    expect(search.get('status')).toBe('contacted')
    expect(search.get('form')).toBe('booking')
  })

  it('drops an unrecognised parameter on the first click instead of carrying it forward', () => {
    // status=bogus never survives parseLeadQuery, so it must not survive into
    // any href built from the resulting query either.
    const query = parseLeadQuery({ city: 'miami', status: 'bogus' })
    const href = filterHref(query, 'form', 'contact')
    const search = new URLSearchParams(href.slice(href.indexOf('?') + 1))
    expect(search.has('status')).toBe(false)
    expect(search.get('city')).toBe('miami')
    expect(search.get('form')).toBe('contact')
  })

  it('produces a bare path with no trailing "?" when every filter is cleared', () => {
    const query = parseLeadQuery({ city: 'miami' })
    const href = filterHref(query, 'city', null)
    expect(href).toBe(`${ADMIN_BASE}/leads`)
  })

  it('preserves includeTest (the "test" param) across a filter change', () => {
    const query = parseLeadQuery({ city: 'miami', test: '1' })
    const href = filterHref(query, 'status', 'new')
    const search = new URLSearchParams(href.slice(href.indexOf('?') + 1))
    expect(search.get('test')).toBe('1')
    expect(search.get('status')).toBe('new')
  })
})

describe('cityDisplayName', () => {
  it('renders the friendly display name for a known city', () => {
    const lookup = buildCityLookup([{ key: 'fort-lauderdale', city: 'Fort Lauderdale' }])
    expect(cityDisplayName(lookup, 'fort-lauderdale')).toBe('Fort Lauderdale')
  })

  it('falls back to the uppercased key when the city has no match, rather than rendering blank', () => {
    const lookup = buildCityLookup([{ key: 'miami', city: 'Miami' }])
    expect(cityDisplayName(lookup, 'deleted-city')).toBe('DELETED-CITY')
  })
})
