import { describe, expect, test } from 'vitest'
import { validateCityContent } from '../src/content/validate'

function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj }
  for (const key of keys) delete copy[key]
  return copy
}

const validDoc = {
  city: 'Testville',
  state: 'TS',
  phone: '555-000-0001',
  phoneHref: 'tel:5550000001',
  address: '1 Test St, Testville, TS 00000',
  status: 'draft',
  research: {
    suburbs: [{ name: 'Suburbia', slug: 'cleaning-services-suburbia' }],
    zips: ['00000'],
    landmarks: ['Test Landmark'],
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

describe('validateCityContent', () => {
  test('returns the doc unchanged for a fully valid fixture', () => {
    expect(validateCityContent(validDoc)).toEqual(validDoc)
  })

  test('accepts an optional contactAddress when present', () => {
    const doc = { ...validDoc, contactAddress: '1 Test St Suite 2, Testville, TS 00000' }
    expect(validateCityContent(doc)).toEqual(doc)
  })

  test('throws when phone is missing', () => {
    expect(() => validateCityContent(omit(validDoc, 'phone'))).toThrow(/phone/i)
  })

  test('throws when research.suburbs is not an array', () => {
    const doc = { ...validDoc, research: { ...validDoc.research, suburbs: 'not-an-array' } }
    expect(() => validateCityContent(doc)).toThrow(/suburbs/i)
  })

  test('throws when maps is missing', () => {
    expect(() => validateCityContent(omit(validDoc, 'maps'))).toThrow(/maps/i)
  })

  test('throws when status is not draft or live', () => {
    const doc = { ...validDoc, status: 'published' }
    expect(() => validateCityContent(doc)).toThrow(/status/i)
  })

  test('throws when stateName is missing', () => {
    expect(() => validateCityContent(omit(validDoc, 'stateName'))).toThrow(/stateName/i)
  })

  test('names every problem at once for a doc with 3 defects', () => {
    const doc = { ...omit(validDoc, 'phone', 'stateName'), status: 'published' }
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
})
