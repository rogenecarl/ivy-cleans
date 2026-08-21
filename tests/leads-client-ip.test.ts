// tests/leads-client-ip.test.ts
import { describe, expect, it } from 'vitest'
import { clientIp } from '../src/leads/client-ip'

function headersOf(entries: Record<string, string>): Pick<Headers, 'get'> {
  return {
    get(name: string) {
      return entries[name] ?? null
    },
  }
}

describe('clientIp', () => {
  it('prefers x-real-ip when present, even alongside a forged x-forwarded-for', () => {
    expect(
      clientIp(headersOf({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.2.3.4, 9.9.9.9' })),
    ).toBe('9.9.9.9')
  })

  it('falls back to the LAST x-forwarded-for entry, not the first', () => {
    expect(clientIp(headersOf({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }))).toBe('9.9.9.9')
  })

  it('works with a single-value x-forwarded-for', () => {
    expect(clientIp(headersOf({ 'x-forwarded-for': '9.9.9.9' }))).toBe('9.9.9.9')
  })

  it('trims whitespace around x-forwarded-for entries', () => {
    expect(clientIp(headersOf({ 'x-forwarded-for': ' 1.2.3.4 ,  9.9.9.9  ' }))).toBe('9.9.9.9')
  })

  it('returns null when both headers are absent', () => {
    expect(clientIp(headersOf({}))).toBeNull()
  })
})
