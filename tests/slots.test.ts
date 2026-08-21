import { describe, expect, test, beforeAll } from 'vitest'
import { s, sl } from '../src/content/slots'
import { getDefaultCity, getCity, cityBits } from '../src/content/store'
import type { CityContent } from '../src/content/types'

describe('slots + store', () => {
  let c: CityContent
  beforeAll(async () => {
    c = await getDefaultCity()
  })
  test('default city is minneapolis, live', async () => {
    expect(c.city).toBe('Minneapolis')
    expect(c.status).toBe('live')
    expect(await getCity('minneapolis')).toEqual(c)
  })
  test('s/sl read typed slots', () => {
    expect(typeof s(c, 'deep.whatIs')).toBe('string')
    expect(Array.isArray(sl(c, 'services.heroParagraphs'))).toBe(true)
  })
  test('s/sl throw on missing or mistyped slots', () => {
    expect(() => s(c, 'nope')).toThrow(/missing or not a string/)
    expect(() => s(c, 'services.heroParagraphs')).toThrow()
    expect(() => sl(c, 'deep.whatIs')).toThrow(/missing or not a list/)
  })
  test('getCity throws on unknown key', async () => {
    await expect(getCity('atlantis')).rejects.toThrow(/unknown city/i)
  })
  test('cityBits picks the token source', () => {
    expect(cityBits(c)).toEqual({
      city: 'Minneapolis', state: 'MN',
      phone: '612-424-0391', phoneHref: 'tel:6124240391',
      stateName: 'Minnesota', phoneDisplay: '(612) 424-0391',
    })
  })
})
