// Code checks for research claims: where a place is (OpenStreetMap Nominatim) and which ZIPs exist (Census table).
// Absence of evidence is neutral; only a place found in the wrong state or too far away counts against a claim.
import fs from 'node:fs'
import zips from './data/zips.json'
import { stubFixturePath } from './model'

export type GeoPoint = { lat: number; lon: number; state: string | null }

export interface Geocoder {
  /** null = not found. Throws on a network error, a timeout or a refusal (429): the caller treats that as neutral. */
  locate(query: string): Promise<GeoPoint | null>
}

export const MAX_DISTANCE_MILES = 40

const TABLE = zips as unknown as Record<string, [number, number, string]>

export function zipInfo(zip: string): { lat: number; lon: number; state: string } | null {
  const row = TABLE[zip]
  return row ? { lat: row[0], lon: row[1], state: row[2] } : null
}

export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 3958.8 * Math.asin(Math.sqrt(h))
}

export function checkPlace(
  found: GeoPoint | null,
  city: GeoPoint | null,
  state: string,
): { verdict: 'ok' | 'far'; reason?: string } {
  if (found === null) return { verdict: 'ok' }
  if (found.state !== null && found.state !== state) {
    return { verdict: 'far', reason: `the map places it in ${found.state}, not ${state}` }
  }
  if (city === null) return { verdict: 'ok' }
  const miles = milesBetween(found, city)
  if (miles > MAX_DISTANCE_MILES) {
    return { verdict: 'far', reason: `the map places it ${Math.round(miles)} miles from the city` }
  }
  return { verdict: 'ok' }
}

export function checkZip(zip: string, city: GeoPoint | null, state: string): 'confirmed' | 'unconfirmed' | 'wrong' {
  const info = zipInfo(zip)
  if (!info) return 'unconfirmed'
  if (info.state !== state) return 'wrong'
  if (city !== null && milesBetween(info, city) > MAX_DISTANCE_MILES) return 'wrong'
  return 'confirmed'
}

const USER_AGENT = 'IvyCleansAdmin/1.0 (+https://ivycleans.com)'
const TIMEOUT_MS = 8000

// one request per second, process-wide: Nominatim's usage policy
let nextSlot = 0

export class NominatimGeocoder implements Geocoder {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly spacingMs = 1000,
  ) {}

  async locate(query: string): Promise<GeoPoint | null> {
    const now = Date.now()
    const at = Math.max(now, nextSlot)
    nextSlot = at + this.spacingMs
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now))

    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.search = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', countrycodes: 'us', limit: '1' }).toString()
    const res = await this.fetchFn(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`geocoder answered ${res.status}`)
    const hits = (await res.json()) as Array<{ lat: string; lon: string; address?: Record<string, string> }>
    if (hits.length === 0) return null
    const iso = hits[0].address?.['ISO3166-2-lvl4'] ?? ''
    return { lat: Number(hits[0].lat), lon: Number(hits[0].lon), state: iso.startsWith('US-') ? iso.slice(3) : null }
  }
}

export class StubGeocoder implements Geocoder {
  constructor(private readonly map: Record<string, GeoPoint | null>) {}
  async locate(query: string): Promise<GeoPoint | null> {
    return this.map[query] ?? null
  }
}

/** The real geocoder, or with STUB_MODEL=1 the stub fixture's `geocode` map (no network in tests and E2E). */
export function makeGeocoder(): Geocoder {
  if (process.env.STUB_MODEL === '1') {
    const raw = fs.readFileSync(stubFixturePath(), 'utf-8')
    return new StubGeocoder((JSON.parse(raw) as { geocode?: Record<string, GeoPoint | null> }).geocode ?? {})
  }
  return new NominatimGeocoder()
}
