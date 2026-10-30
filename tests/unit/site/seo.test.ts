import { describe, expect, it } from 'vitest'
import { canonicalFor, cityRobots } from '@/site/data/seo'

const noindex = { robots: { index: false, follow: false } }

describe('cityRobots', () => {
  it('keeps a draft out of the index', () => {
    expect(cityRobots({ city: 'Houston', status: 'draft' })).toEqual(noindex)
  })

  it('keeps a live city with no domain out of the index: it exists only at /<key>', () => {
    expect(cityRobots({ city: 'Houston', status: 'live' })).toEqual(noindex)
  })

  it('indexes a live city on its own domain', () => {
    expect(cityRobots({ city: 'Houston', status: 'live', domain: 'ivycleanshouston.com' })).toEqual({})
  })

  it('indexes the default city, which has the operator host instead of a domain', () => {
    expect(cityRobots({ city: 'Minneapolis', status: 'live' })).toEqual({})
  })
})

describe('canonicalFor', () => {
  const live = { status: 'live', domain: 'ivycleanshouston.com' } as const

  it("points every page at the city's own domain", () => {
    expect(canonicalFor(live, '/contact')).toEqual({ alternates: { canonical: 'https://ivycleanshouston.com/contact' } })
  })

  it('points the front page at the bare domain', () => {
    expect(canonicalFor(live, '/')).toEqual({ alternates: { canonical: 'https://ivycleanshouston.com' } })
  })

  it('claims nothing for a draft or a city with no domain', () => {
    expect(canonicalFor({ status: 'draft', domain: 'ivycleanshouston.com' }, '/contact')).toEqual({})
    expect(canonicalFor({ status: 'live' }, '/contact')).toEqual({})
  })
})
