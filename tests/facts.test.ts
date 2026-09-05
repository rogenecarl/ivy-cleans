import { describe, expect, test } from 'vitest'
import { deriveFacts, resolveStateCode } from '../src/pipeline/facts'

describe('deriveFacts', () => {
  test('derives phone formats and stateName from digits + state code', () => {
    expect(deriveFacts({ city: 'Miami', state: 'FL', phoneDigits: '3055550142' })).toEqual({
      city: 'Miami',
      state: 'FL',
      stateName: 'Florida',
      phone: '305-555-0142',
      phoneDisplay: '(305) 555-0142',
      phoneHref: 'tel:3055550142',
    })
  })

  test('echoes address and notes through when provided', () => {
    const facts = deriveFacts({
      city: 'Austin',
      state: 'TX',
      phoneDigits: '5125550199',
      address: '1 Congress Ave, Austin, TX 78701',
    })
    expect(facts.address).toBe('1 Congress Ave, Austin, TX 78701')
  })

  test('omits address when not provided', () => {
    const facts = deriveFacts({ city: 'Austin', state: 'TX', phoneDigits: '5125550199' })
    expect(facts.address).toBeUndefined()
  })

  test('rejects a 9-digit phone number', () => {
    expect(() => deriveFacts({ city: 'Austin', state: 'TX', phoneDigits: '512555019' })).toThrow(
      /10 digits/
    )
  })

  test('rejects an 11-digit phone number', () => {
    expect(() =>
      deriveFacts({ city: 'Austin', state: 'TX', phoneDigits: '51255501990' })
    ).toThrow(/10 digits/)
  })

  test('rejects a phone number containing letters', () => {
    expect(() =>
      deriveFacts({ city: 'Austin', state: 'TX', phoneDigits: '512555019a' })
    ).toThrow(/10 digits/)
  })

  test('looks up stateName for MN and TX', () => {
    expect(deriveFacts({ city: 'Minneapolis', state: 'MN', phoneDigits: '6125550101' }).stateName).toBe(
      'Minnesota'
    )
    expect(deriveFacts({ city: 'Dallas', state: 'TX', phoneDigits: '2145550101' }).stateName).toBe(
      'Texas'
    )
  })

  test('normalizes a lowercase state code to uppercase FL / Florida', () => {
    const facts = deriveFacts({ city: 'Miami', state: 'fl', phoneDigits: '3055550142' })
    expect(facts.state).toBe('FL')
    expect(facts.stateName).toBe('Florida')
  })

  test('throws mentioning the unknown code for an invalid state', () => {
    expect(() =>
      deriveFacts({ city: 'Nowhere', state: 'ZZ', phoneDigits: '5555550123' })
    ).toThrow(/ZZ/)
  })
})

describe('state input', () => {
  test('accepts the two-letter code, in any case', () => {
    expect(resolveStateCode('FL')).toBe('FL')
    expect(resolveStateCode('fl')).toBe('FL')
    expect(resolveStateCode(' Fl ')).toBe('FL')
  })

  test('accepts the full state name, in any case or spacing', () => {
    expect(resolveStateCode('Florida')).toBe('FL')
    expect(resolveStateCode('florida')).toBe('FL')
    expect(resolveStateCode('  FLORIDA  ')).toBe('FL')
  })

  test('handles multi-word states and collapsed whitespace', () => {
    expect(resolveStateCode('New Mexico')).toBe('NM')
    expect(resolveStateCode('  new   mexico ')).toBe('NM')
    expect(resolveStateCode('west virginia')).toBe('WV')
  })

  test('REJECTS rather than guesses at an abbreviation or misspelling', () => {
    // This value reaches published copy on a customer-facing site. A wrong
    // guess is far worse than an error the operator can act on.
    expect(resolveStateCode('Fla.')).toBeNull()
    expect(resolveStateCode('Flor')).toBeNull()
    expect(resolveStateCode('Floridaa')).toBeNull()
    expect(resolveStateCode('XX')).toBeNull()
    expect(resolveStateCode('')).toBeNull()
    expect(resolveStateCode('   ')).toBeNull()
  })

  test('deriveFacts takes either form and always stores the code', () => {
    // One canonical stored value, so {ST} and {stateName} can never disagree
    // between two pages of the same site.
    const fromName = deriveFacts({ city: 'Miami', state: 'Florida', phoneDigits: '3055550142' })
    const fromCode = deriveFacts({ city: 'Miami', state: 'FL', phoneDigits: '3055550142' })
    expect(fromName).toEqual(fromCode)
    expect(fromName.state).toBe('FL')
    expect(fromName.stateName).toBe('Florida')
  })

  test('names the accepted forms when it cannot resolve one', () => {
    expect(() =>
      deriveFacts({ city: 'Miami', state: 'Fla.', phoneDigits: '3055550142' }),
    ).toThrow(/two-letter code.*full state name/)
  })
})
