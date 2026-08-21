// tests/leads-payload-coercion.test.ts
/*
 * coercePayload (src/leads/store.ts) is the seam that guarantees
 * LeadRecord.payload is really Record<string, string>, no matter what a
 * Prisma `Json` column's parsed value turns out to be. It is a pure
 * function with no database dependency, so it lives in its own file rather
 * than tests/leads-store.test.ts, which is entirely DB-gated and skips in
 * this environment (no DATABASE_URL) -- this file must run regardless.
 */
import { describe, expect, it } from 'vitest'
import { coercePayload } from '../src/leads/store'

describe('coercePayload', () => {
  it('passes flat strings through unchanged', () => {
    expect(coercePayload({ service: 'Deep Cleaning', bedrooms: '3' })).toEqual({
      service: 'Deep Cleaning',
      bedrooms: '3',
    })
  })

  it('stringifies a nested object rather than throwing', () => {
    expect(coercePayload({ address: { street: '1420 Brickell Ave' } })).toEqual({
      address: '{"street":"1420 Brickell Ave"}',
    })
  })

  it('stringifies a number', () => {
    expect(coercePayload({ bedrooms: 3 })).toEqual({ bedrooms: '3' })
  })

  it('returns an empty object for a null payload', () => {
    expect(coercePayload(null)).toEqual({})
  })

  it('returns an empty object for an undefined payload', () => {
    expect(coercePayload(undefined)).toEqual({})
  })

  it('returns an empty object for an array payload instead of crashing', () => {
    expect(coercePayload(['a', 'b'])).toEqual({})
  })

  it('returns an empty object for a bare string payload instead of crashing', () => {
    expect(coercePayload('not an object')).toEqual({})
  })

  it('turns a null or undefined field value into an empty string', () => {
    expect(coercePayload({ notes: null })).toEqual({ notes: '' })
  })
})
