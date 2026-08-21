import { describe, expect, test } from 'vitest'
import { t, citySlug } from '../src/content/interpolate'

const c = {
  city: 'Minneapolis',
  state: 'MN',
  phone: '612-424-0391',
  phoneHref: 'tel:6124240391',
  stateName: 'Minnesota',
  phoneDisplay: '(612) 424-0391',
}

describe('t()', () => {
  test('replaces every token', () => {
    expect(t('Deep Cleaning {city}', c)).toBe('Deep Cleaning Minneapolis')
    expect(t('Cleaning Service in {city}, {state} | Ivy Cleans', c)).toBe(
      'Cleaning Service in Minneapolis, MN | Ivy Cleans',
    )
    expect(t('Call {phone} or {phoneHref}', c)).toBe('Call 612-424-0391 or tel:6124240391')
    expect(t('home cleaning services {cityLower} {stateLower}', c)).toBe(
      'home cleaning services minneapolis mn',
    )
    expect(t('{stateName}', c)).toBe('Minnesota')
    expect(t('{phoneDisplay}', c)).toBe('(612) 424-0391')
  })
  test('string without tokens passes through untouched', () => {
    const s = 'Our Values & Guarantee — 100% satisfaction.'
    expect(t(s, c)).toBe(s)
  })
  test('throws on an unknown token instead of leaking braces to the page', () => {
    expect(() => t('Hello {ctiy}', c)).toThrow(/unknown token/i)
  })
  test('throws on doubled braces instead of leaking outer braces', () => {
    expect(() => t('Hello {{city}}!', c)).toThrow(/unknown token|malformed/i)
  })
  test('throws on an unclosed brace instead of passing it through', () => {
    expect(() => t('Deep Cleaning {city', c)).toThrow(/unknown token|malformed/i)
  })
  test('throws on a token name it does not recognize (digits) instead of passing it through', () => {
    expect(() => t('Call {phone2}', c)).toThrow(/unknown token|malformed/i)
  })
  test('citySlug lowercases and hyphenates', () => {
    expect(citySlug('Minneapolis')).toBe('minneapolis')
    expect(citySlug('St. Louis Park')).toBe('st-louis-park')
  })
})
