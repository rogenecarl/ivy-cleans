// tests/leads-spam.test.ts
import { describe, expect, it } from 'vitest'
import { RATE_LIMIT, hashIp, honeypotFilled, overRateLimit } from '../src/leads/spam'

describe('hashIp', () => {
  it('is stable for the same ip and salt', () => {
    expect(hashIp('203.0.113.7', 'pepper')).toBe(hashIp('203.0.113.7', 'pepper'))
  })

  it('differs when the salt differs', () => {
    expect(hashIp('203.0.113.7', 'a')).not.toBe(hashIp('203.0.113.7', 'b'))
  })

  it('never returns the raw ip', () => {
    expect(hashIp('203.0.113.7', 'pepper')).not.toContain('203.0.113.7')
  })

  it('returns null when the ip is unknown', () => {
    expect(hashIp(null, 'pepper')).toBeNull()
  })

  it('returns null when no salt is configured, rather than throwing', () => {
    // `null` is what src/leads/env.ts produces for an IP_HASH_SALT that is
    // absent OR blank -- the two used to mean different things, and the blank
    // case refused every submission in production. The lead is now captured
    // with no ipHash instead; only the per-IP rate limit is lost.
    expect(hashIp('203.0.113.7', null)).toBeNull()
  })

  it('throws on an empty salt', () => {
    expect(() => hashIp('203.0.113.7', '')).toThrow('IP_HASH_SALT')
  })

  it('throws on a whitespace-only salt', () => {
    expect(() => hashIp('203.0.113.7', '  ')).toThrow('IP_HASH_SALT')
  })

  it('returns null when the ip is unknown even with a valid salt', () => {
    expect(hashIp(null, 'pepper')).toBeNull()
  })
})

describe('honeypotFilled', () => {
  it('accepts an empty honeypot', () => {
    expect(honeypotFilled('')).toBe(false)
  })

  it('accepts a missing honeypot field', () => {
    expect(honeypotFilled(null)).toBe(false)
  })

  it('rejects a filled honeypot', () => {
    expect(honeypotFilled('http://spam')).toBe(true)
  })

  it('rejects a single space in the honeypot', () => {
    expect(honeypotFilled(' ')).toBe(true)
  })

  it('rejects a tab in the honeypot', () => {
    expect(honeypotFilled('\t')).toBe(true)
  })

  it('rejects a newline in the honeypot', () => {
    expect(honeypotFilled('\n')).toBe(true)
  })
})

describe('overRateLimit', () => {
  it('accepts at exactly one below the limit', () => {
    expect(overRateLimit(RATE_LIMIT - 1)).toBe(false)
  })

  it('rejects at the limit', () => {
    expect(overRateLimit(RATE_LIMIT)).toBe(true)
  })
})
