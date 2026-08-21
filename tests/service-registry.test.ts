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

  /*
   * These three iterate REGISTERED entries, not SERVICE_SLUGS. Five services
   * are still unimplemented at this point in the plan and resolve to
   * undefined; asserting over all seven now would fail for a reason that is
   * not a defect. Task 5 registers the rest and switches these to
   * SERVICE_SLUGS, at which point they also prove nothing was left unwired.
   */
  const registered = SERVICE_SLUGS.filter((s) => serviceBySlug(s) !== undefined)

  it('registers at least the two services that already exist', () => {
    expect(registered).toContain('deep-cleaning')
    expect(registered).toContain('move-in-move-out-cleaning')
  })

  it('marks move-in-move-out as bespoke and every other registered service as templated', () => {
    for (const slug of registered) {
      const entry = serviceBySlug(slug)!
      expect(entry.kind).toBe(slug === 'move-in-move-out-cleaning' ? 'bespoke' : 'template')
    }
  })

  it('gives every registered templated service a content builder', () => {
    for (const slug of registered) {
      const entry = serviceBySlug(slug)!
      if (entry.kind === 'template') expect(typeof entry.content).toBe('function')
    }
  })

  it('gives every registered service a display name', () => {
    for (const slug of registered) {
      expect(serviceBySlug(slug)!.name.length).toBeGreaterThan(0)
    }
  })
})
