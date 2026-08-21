// tests/service-registry.test.ts
import { describe, expect, it } from 'vitest'
import { SERVICE_SLUGS, serviceBySlug } from '../src/data/services/registry'

describe('service registry', () => {
  it('holds exactly the seven client-specified slugs', () => {
    expect([...SERVICE_SLUGS].sort()).toEqual(
      [
        'airbnb-cleaning',
        'apartment-cleaning',
        'deep-cleaning',
        'move-in-move-out-cleaning',
        'post-construction-cleaning',
        'pre-listing-cleaning',
        'standard-cleaning',
      ].sort(),
    )
  })

  it('resolves a known slug', () => {
    expect(serviceBySlug('deep-cleaning')?.slug).toBe('deep-cleaning')
  })

  it('returns undefined for an unknown slug rather than throwing', () => {
    expect(serviceBySlug('not-a-service')).toBeUndefined()
    expect(serviceBySlug('')).toBeUndefined()
    expect(serviceBySlug('../etc')).toBeUndefined()
  })

  it('registers every client-specified slug', () => {
    for (const slug of SERVICE_SLUGS) {
      expect(serviceBySlug(slug)).not.toBeUndefined()
    }
  })

  it('marks move-in-move-out as bespoke and every other service as templated', () => {
    for (const slug of SERVICE_SLUGS) {
      const entry = serviceBySlug(slug)!
      expect(entry.kind).toBe(slug === 'move-in-move-out-cleaning' ? 'bespoke' : 'template')
    }
  })

  it('gives every templated service a content builder', () => {
    for (const slug of SERVICE_SLUGS) {
      const entry = serviceBySlug(slug)!
      if (entry.kind === 'template') expect(typeof entry.content).toBe('function')
    }
  })

  it('gives every service a display name', () => {
    for (const slug of SERVICE_SLUGS) {
      expect(serviceBySlug(slug)!.name.length).toBeGreaterThan(0)
    }
  })
})
