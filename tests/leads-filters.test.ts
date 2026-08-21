// tests/leads-filters.test.ts
import { describe, expect, it } from 'vitest'
import { leadQueryToSearch, parseLeadQuery } from '../src/leads/filters'

describe('parseLeadQuery', () => {
  it('defaults to everything except test rows', () => {
    expect(parseLeadQuery({})).toEqual({
      city: null,
      status: null,
      formType: null,
      includeTest: false,
    })
  })

  it('reads all four params', () => {
    expect(
      parseLeadQuery({ city: 'miami', status: 'contacted', form: 'booking', test: '1' }),
    ).toEqual({ city: 'miami', status: 'contacted', formType: 'booking', includeTest: true })
  })

  it('drops an unknown status instead of erroring', () => {
    expect(parseLeadQuery({ status: 'banana' }).status).toBeNull()
  })

  it('drops an unknown form type', () => {
    expect(parseLeadQuery({ form: 'carrier-pigeon' }).formType).toBeNull()
  })

  it('rejects a city key that is not a safe slug', () => {
    expect(parseLeadQuery({ city: '../../etc' }).city).toBeNull()
  })

  it('takes the first value when a param repeats', () => {
    expect(parseLeadQuery({ city: ['miami', 'houston'] }).city).toBe('miami')
  })
})

describe('leadQueryToSearch', () => {
  it('omits empty filters', () => {
    expect(
      leadQueryToSearch({ city: null, status: null, formType: null, includeTest: false }),
    ).toBe('')
  })

  it('round-trips through parseLeadQuery', () => {
    const query = { city: 'miami', status: 'quoted' as const, formType: 'contact' as const, includeTest: true }
    const search = leadQueryToSearch(query)
    expect(parseLeadQuery(Object.fromEntries(new URLSearchParams(search)))).toEqual(query)
  })
})
