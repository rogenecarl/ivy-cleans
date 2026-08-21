// src/content/slots.ts
/*
 * Render-time slot accessors. Unlike Plan 1's module-eval accessors, these
 * take the city document explicitly, so a bad document fails the REQUEST
 * (or the per-city build) — never the whole process (Plan 1 review #8).
 */
import type { CityContent } from './types'

export function s(c: CityContent, id: string): string {
  const v = c.sections[id]
  if (typeof v !== 'string') throw new Error(`content slot "${id}" missing or not a string for city "${c.city}"`)
  return v
}

export function sl(c: CityContent, id: string): string[] {
  const v = c.sections[id]
  if (!Array.isArray(v)) throw new Error(`content slot "${id}" missing or not a list for city "${c.city}"`)
  return v
}
