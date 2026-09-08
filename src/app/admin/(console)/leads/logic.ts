// src/app/admin/(console)/leads/logic.ts
// Pure decisions for the Leads screen, testable without the framework.
import { leadQueryToSearch } from '@/leads/filters'
import type { LeadQuery } from '@/leads/types'
import { ADMIN_BASE } from '@/lib/admin-routes'

// href keeping every current filter but the one being set; canonicalised through the validated query
export function filterHref(query: LeadQuery, key: string, value: string | null): string {
  const params = new URLSearchParams(leadQueryToSearch(query))
  if (value === null) params.delete(key)
  else params.set(key, value)
  const search = params.toString()
  return `${ADMIN_BASE}/leads${search ? `?${search}` : ''}`
}

/** Minimal shape this module needs from a CityRow, so it stays test-friendly. */
export type CityLookupSource = { key: string; city: string }

/** Maps a city's URL key to its display name, for the lead list's city pill. */
export function buildCityLookup(cities: CityLookupSource[]): Record<string, string> {
  const lookup: Record<string, string> = {}
  for (const c of cities) lookup[c.key] = c.city
  return lookup
}

// display name for a lead's city pill; the uppercased key when the city no longer exists
export function cityDisplayName(lookup: Record<string, string>, cityKey: string): string {
  return lookup[cityKey] ?? cityKey.toUpperCase()
}
