// tests/leads-attribution.test.ts
import { describe, expect, it } from 'vitest'
import { attributeCity } from '../src/leads/attribution'
import type { DomainsIndex } from '../src/content/resolve-rewrite'

const domains: DomainsIndex = {
  default: 'minneapolis',
  hosts: { 'miamicleans.com': 'miami', 'houstoncleans.com': 'houston' },
}

describe('attributeCity', () => {
  it('uses the mapped city for a tenant domain', () => {
    expect(attributeCity('miamicleans.com', 'anything', domains)).toEqual({
      cityKey: 'miami',
      isTest: false,
    })
  })

  it('ignores the rendered key entirely when the host is mapped', () => {
    expect(attributeCity('houstoncleans.com', 'miami', domains)).toEqual({
      cityKey: 'houston',
      isTest: false,
    })
  })

  it('lowercases the host and strips the port', () => {
    expect(attributeCity('MiamiCleans.com:3000', 'x', domains).cityKey).toBe('miami')
  })

  it('treats the default host serving the default city as real', () => {
    expect(attributeCity('ivycleans.com', 'minneapolis', domains)).toEqual({
      cityKey: 'minneapolis',
      isTest: false,
    })
  })

  it('treats an unmapped host rendering another city as a preview', () => {
    expect(attributeCity('localhost', 'testville', domains)).toEqual({
      cityKey: 'testville',
      isTest: true,
    })
  })

  it('treats an empty host as a preview', () => {
    expect(attributeCity('', 'miami', domains)).toEqual({ cityKey: 'miami', isTest: true })
  })
})
