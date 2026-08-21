import { describe, expect, test } from 'vitest'
import { deriveFacts } from '../src/pipeline/facts'

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
      notes: 'Family-owned since 2010.',
    })
    expect(facts.address).toBe('1 Congress Ave, Austin, TX 78701')
    expect(facts.notes).toBe('Family-owned since 2010.')
  })

  test('omits address and notes when not provided', () => {
    const facts = deriveFacts({ city: 'Austin', state: 'TX', phoneDigits: '5125550199' })
    expect(facts.address).toBeUndefined()
    expect(facts.notes).toBeUndefined()
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
