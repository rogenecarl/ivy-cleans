// tests/leads-spam.test.ts
import { describe, expect, it } from 'vitest'
import { RATE_LIMIT, hashIp, spamVerdict } from '../src/leads/spam'

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

describe('spamVerdict', () => {
  it('accepts an empty honeypot under the limit', () => {
    expect(spamVerdict({ honeypotValue: '', recentCount: 0 })).toEqual({ accept: true })
  })

  it('accepts a missing honeypot field', () => {
    expect(spamVerdict({ honeypotValue: null, recentCount: 0 })).toEqual({ accept: true })
  })

  it('rejects a filled honeypot', () => {
    expect(spamVerdict({ honeypotValue: 'http://spam', recentCount: 0 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })

  it('accepts at exactly one below the limit', () => {
    expect(spamVerdict({ honeypotValue: '', recentCount: RATE_LIMIT - 1 })).toEqual({
      accept: true,
    })
  })

  it('rejects at the limit', () => {
    expect(spamVerdict({ honeypotValue: '', recentCount: RATE_LIMIT })).toEqual({
      accept: false,
      reason: 'rate-limit',
    })
  })

  it('checks the honeypot before the rate limit', () => {
    expect(spamVerdict({ honeypotValue: 'x', recentCount: 999 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })

  it('rejects a single space in the honeypot', () => {
    expect(spamVerdict({ honeypotValue: ' ', recentCount: 0 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })

  it('rejects a tab in the honeypot', () => {
    expect(spamVerdict({ honeypotValue: '\t', recentCount: 0 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })

  it('rejects a newline in the honeypot', () => {
    expect(spamVerdict({ honeypotValue: '\n', recentCount: 0 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })
})
