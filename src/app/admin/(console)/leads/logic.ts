// src/app/admin/(console)/leads/logic.ts
/*
 * Pure decisions for the Leads screen, kept out of page.tsx so they can be
 * unit-tested without the framework in scope, the same split admin-logic.ts
 * uses for the Sites screen.
 */
import { leadQueryToSearch } from '@/leads/filters'
import type { LeadQuery } from '@/leads/types'
import { ADMIN_BASE } from '@/lib/admin-routes'

/**
 * Builds an href that keeps every current filter except the one being set.
 *
 * Canonicalizes through the validated `query` (leadQueryToSearch), not the
 * raw searchParams, so an unrecognised parameter is dropped on the very
 * first filter click instead of riding along in the URL forever.
 */
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

/**
 * The name to show in a lead's city pill: the friendly display name when the
 * city still exists, otherwise the uppercased key. A lead's city can outlive
 * the city itself (deleted after its leads were captured), and that lead must
 * stay visible and attributable rather than rendering blank.
 */
export function cityDisplayName(lookup: Record<string, string>, cityKey: string): string {
  return lookup[cityKey] ?? cityKey.toUpperCase()
}
