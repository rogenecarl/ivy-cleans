// tests/service-registry.test.ts
import { describe, expect, it } from 'vitest'
import { SERVICE_SLUGS, serviceBySlug } from '../src/data/services/registry'
import { SERVICE_LOCAL_SLUGS } from '../src/content/slots'
import type { CityContent } from '../src/content/types'

describe('service registry', () => {
  it('holds exactly the seven client-specified slugs', () => {
    expect([...SERVICE_SLUGS].sort()).toEqual(
      [
        'airbnb-cleaning',
        'apartment-cleaning',
        'deep-cleaning',
        'move-in-move-out-cleaning',
        'post-construction-cleaning',
        'pre-listing-cleaning',
        'standard-cleaning',
      ].sort(),
    )
  })

  it('resolves a known slug', () => {
    expect(serviceBySlug('deep-cleaning')?.slug).toBe('deep-cleaning')
  })

  it('returns undefined for an unknown slug rather than throwing', () => {
    expect(serviceBySlug('not-a-service')).toBeUndefined()
    expect(serviceBySlug('')).toBeUndefined()
    expect(serviceBySlug('../etc')).toBeUndefined()
  })

  it('registers every client-specified slug', () => {
    for (const slug of SERVICE_SLUGS) {
      expect(serviceBySlug(slug)).not.toBeUndefined()
    }
  })

  it('marks move-in-move-out as bespoke and every other service as templated', () => {
    for (const slug of SERVICE_SLUGS) {
      const entry = serviceBySlug(slug)!
      expect(entry.kind).toBe(slug === 'move-in-move-out-cleaning' ? 'bespoke' : 'template')
    }
  })

  it('gives every templated service a content builder', () => {
    for (const slug of SERVICE_SLUGS) {
      const entry = serviceBySlug(slug)!
      if (entry.kind === 'template') expect(typeof entry.content).toBe('function')
    }
  })

  it('gives every service a display name', () => {
    for (const slug of SERVICE_SLUGS) {
      expect(serviceBySlug(slug)!.name.length).toBeGreaterThan(0)
    }
  })
})

describe('service local sections', () => {
  /*
   * content-strategy C. Six of the seven service pages were byte-identical in
   * every city; each now carries one generated paragraph saying what this city
   * changes about the job. These tests pin the two halves of that contract:
   * the builder reads the slot the pipeline writes, and a city without the
   * slot still renders.
   */
  function cityWith(sections: Record<string, string | string[]>): CityContent {
    return {
      city: 'Testville',
      state: 'TS',
      stateName: 'Testonia',
      phone: '555-000-0001',
      phoneDisplay: '(555) 000-0001',
      phoneHref: 'tel:5550000001',
      address: '1 Test St',
      status: 'draft',
      hasSuburbPages: false,
      maps: { front: null, home: null, contact: null },
      research: { suburbs: [], zips: [], conditions: [], mapEmbedUrl: null },
      sections: { 'deep.whatIs': 'Deep cleaning is a top-to-bottom service.', ...sections },
    }
  }

  it('every template service reads its own local slot into whatIs.local', () => {
    for (const slug of SERVICE_LOCAL_SLUGS) {
      const entry = serviceBySlug(slug)!
      expect(entry.kind).toBe('template')
      if (entry.kind !== 'template') continue
      const built = entry.content(cityWith({ [`service.${slug}.local`]: `LOCAL-${slug}` }))
      expect(built.whatIs.local).toBe(`LOCAL-${slug}`)
    }
  })

  it('reads the slot with sOpt, so a city without one still renders', () => {
    /*
     * The load-bearing one. Minneapolis is LIVE and has none of these slots.
     * `s()` throws on a missing slot — following the handoff's `s(c, ...)`
     * literally would 500 all six of its service pages the moment this ships.
     */
    for (const slug of SERVICE_LOCAL_SLUGS) {
      const entry = serviceBySlug(slug)!
      if (entry.kind !== 'template') continue
      expect(() => entry.content(cityWith({}))).not.toThrow()
      expect(entry.content(cityWith({})).whatIs.local).toBeUndefined()
    }
  })

  it('treats a blank slot as absent rather than rendering an empty paragraph', () => {
    const entry = serviceBySlug('airbnb-cleaning')!
    if (entry.kind !== 'template') return
    const built = entry.content(cityWith({ 'service.airbnb-cleaning.local': '   ' }))
    expect(built.whatIs.local).toBeUndefined()
  })
})
