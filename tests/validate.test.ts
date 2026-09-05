import { describe, expect, test, it } from 'vitest'
import { validateCityContent } from '../src/content/validate'

function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj }
  for (const key of keys) delete copy[key]
  return copy
}

// A factory, not a shared constant — several tests mutate nested fields
// (e.g. doc.research.suburbs) and must not leak that mutation into siblings.
function validDoc() {
  return {
    city: 'Testville',
    state: 'TS',
    phone: '555-000-0001',
    phoneHref: 'tel:5550000001',
    address: '1 Test St, Testville, TS 00000',
    status: 'draft',
    research: {
      suburbs: [
        {
          name: 'Suburbia',
          slug: 'cleaning-services-suburbia',
          subdivisions: ['The Meadows'],
          housingCharacter: 'Mostly 1990s two-story builds on slab, HOA-governed.',
          conditions: [{ condition: 'Clay soil foundation cracking', implication: 'Extra dust along baseboards', copySafe: true }],
        },
      ],
      zips: ['00000'],
      conditions: [{ condition: 'Humid summers', implication: 'Mildew in bathrooms', copySafe: true }],
      mapEmbedUrl: null,
    },
    sections: {
      'services.heroParagraphs': ['Para one.', 'Para two.'],
      'deep.whatIs': 'A single string slot.',
    },
    stateName: 'Testonia',
    phoneDisplay: '(555) 000-0001',
    maps: {
      front: null,
      home: null,
      contact: null,
    },
    hasSuburbPages: false,
  }
}

describe('validateCityContent', () => {
  test('returns the doc unchanged for a fully valid fixture', () => {
    const doc = validDoc()
    expect(validateCityContent(doc)).toEqual(doc)
  })

  test('accepts an optional contactAddress when present', () => {
    const doc = { ...validDoc(), contactAddress: '1 Test St Suite 2, Testville, TS 00000' }
    expect(validateCityContent(doc)).toEqual(doc)
  })

  test('accepts an optional ops block when present', () => {
    const doc = {
      ...validDoc(),
      ops: {
        zips: ['00000'],
        servingSince: '2024-03',
        crewLead: 'Maria',
        crewSize: 4,
        homesCleaned: 340,
        reviews: [{ quote: 'Spotless.', firstName: 'Dan', area: 'Suburbia', date: '2025-06' }],
      },
    }
    expect(validateCityContent(doc)).toEqual(doc)
  })

  test('throws when ops is present but not an object', () => {
    expect(() => validateCityContent({ ...validDoc(), ops: 'Maria' })).toThrow(/ops/)
  })

  test('throws when a supplied ops field has the wrong type', () => {
    // The ops block is what the prompts are REQUIRED to use verbatim. A
    // number where a name belongs would reach a live page as written.
    expect(() => validateCityContent({ ...validDoc(), ops: { crewLead: 4 } })).toThrow(/ops\.crewLead/)
    expect(() => validateCityContent({ ...validDoc(), ops: { homesCleaned: '340' } })).toThrow(
      /ops\.homesCleaned/,
    )
    expect(() => validateCityContent({ ...validDoc(), ops: { zips: '00000' } })).toThrow(/ops\.zips/)
  })

  test('throws when a review is missing the attribution that makes it checkable', () => {
    expect(() =>
      validateCityContent({ ...validDoc(), ops: { reviews: [{ quote: 'Spotless.' }] } }),
    ).toThrow(/ops\.reviews\[0\]/)
  })

  test('throws when phone is missing', () => {
    expect(() => validateCityContent(omit(validDoc(), 'phone'))).toThrow(/phone/i)
  })

  test('throws when research.suburbs is not an array', () => {
    const doc = validDoc()
    ;(doc.research as Record<string, unknown>).suburbs = 'not-an-array'
    expect(() => validateCityContent(doc)).toThrow(/suburbs/i)
  })

  test('throws when maps is missing', () => {
    expect(() => validateCityContent(omit(validDoc(), 'maps'))).toThrow(/maps/i)
  })

  test('throws when status is not draft or live', () => {
    const doc = { ...validDoc(), status: 'published' }
    expect(() => validateCityContent(doc)).toThrow(/status/i)
  })

  test('throws when stateName is missing', () => {
    expect(() => validateCityContent(omit(validDoc(), 'stateName'))).toThrow(/stateName/i)
  })

  test('names every problem at once for a doc with 3 defects', () => {
    const doc = { ...omit(validDoc(), 'phone', 'stateName'), status: 'published' }
    let message = ''
    try {
      validateCityContent(doc)
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).toMatch(/invalid city document:/i)
    expect(message).toMatch(/phone/i)
    expect(message).toMatch(/status/i)
    expect(message).toMatch(/stateName/i)
  })

  it('rejects a suburb missing its researched fields', () => {
    const doc = validDoc()
    // @ts-expect-error deliberately incomplete — no subdivisions/housingCharacter/conditions
    doc.research.suburbs = [{ name: 'Katy', slug: 'katy' }]
    expect(() => validateCityContent(doc)).toThrow(/research\.suburbs\[0\]/)
  })

  it('rejects research still carrying landmarks', () => {
    const doc = validDoc()
    ;(doc.research as Record<string, unknown>).landmarks = ['Kemah Boardwalk']
    expect(() => validateCityContent(doc)).toThrow(/landmarks/)
  })
})
