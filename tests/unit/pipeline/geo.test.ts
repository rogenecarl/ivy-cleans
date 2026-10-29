import { afterEach, describe, expect, it, vi } from 'vitest'
import { NominatimGeocoder, checkPlace, checkZip, milesBetween, zipInfo, type GeoPoint } from '@/server/pipeline/geo'

const MPLS: GeoPoint = { lat: 44.9778, lon: -93.265, state: 'MN' }
const STPAUL: GeoPoint = { lat: 44.9537, lon: -93.09, state: 'MN' }

describe('milesBetween', () => {
  it('measures Minneapolis to St Paul at about ten miles', () => {
    const miles = milesBetween(MPLS, STPAUL)
    expect(miles).toBeGreaterThan(8)
    expect(miles).toBeLessThan(11)
  })
})

describe('checkPlace', () => {
  it('treats a place the geocoder could not find as neutral', () => {
    expect(checkPlace(null, MPLS, 'MN')).toEqual({ verdict: 'ok' })
  })

  it('is neutral when the city itself has no location', () => {
    expect(checkPlace(STPAUL, null, 'MN')).toEqual({ verdict: 'ok' })
  })

  it('accepts a place nearby in the same state', () => {
    expect(checkPlace(STPAUL, MPLS, 'MN').verdict).toBe('ok')
  })

  it('flags a place found in another state', () => {
    const r = checkPlace({ lat: 44.98, lon: -93.2, state: 'WI' }, MPLS, 'MN')
    expect(r.verdict).toBe('far')
    expect(r.reason).toMatch(/WI/)
  })

  it('flags a place more than 40 miles away', () => {
    const r = checkPlace({ lat: 45.56, lon: -94.16, state: 'MN' }, MPLS, 'MN') // St Cloud, ~60 mi
    expect(r.verdict).toBe('far')
    expect(r.reason).toMatch(/miles/)
  })
})

describe('zip table', () => {
  it('knows a real Minneapolis ZIP', () => {
    expect(zipInfo('55401')?.state).toBe('MN')
  })

  it('checks ZIPs against the city', () => {
    expect(checkZip('55401', MPLS, 'MN')).toBe('confirmed')
    expect(checkZip('33101', MPLS, 'MN')).toBe('wrong')
    expect(checkZip('00000', MPLS, 'MN')).toBe('unconfirmed')
  })

  it('confirms a ZIP in the right state when the city has no location', () => {
    expect(checkZip('55401', null, 'MN')).toBe('confirmed')
  })
})

describe('NominatimGeocoder', () => {
  afterEach(() => vi.useRealTimers())

  it('throws on a rate-limited answer, so the caller can fall back', async () => {
    const fetchFn = vi.fn(async () => new Response('slow down', { status: 429 }))
    const geo = new NominatimGeocoder(fetchFn as unknown as typeof fetch)
    await expect(geo.locate('Edina, Minneapolis, MN')).rejects.toThrow(/429/)
  })

  it('returns null when nothing is found, and a point with its state when found', async () => {
    const answers = [
      [],
      [{ lat: '44.889', lon: '-93.35', address: { 'ISO3166-2-lvl4': 'US-MN' } }],
    ]
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(answers.shift())))
    const geo = new NominatimGeocoder(fetchFn as unknown as typeof fetch, 0)
    expect(await geo.locate('Nowhere, Minneapolis, MN')).toBeNull()
    expect(await geo.locate('Edina, Minneapolis, MN')).toEqual({ lat: 44.889, lon: -93.35, state: 'MN' })
  })

  it('waits at least a second between requests', async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn(async () => new Response('[]'))
    const geo = new NominatimGeocoder(fetchFn as unknown as typeof fetch)
    const first = geo.locate('a')
    await vi.advanceTimersByTimeAsync(0)
    const second = geo.locate('b')
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(600)
    await Promise.all([first, second])
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
