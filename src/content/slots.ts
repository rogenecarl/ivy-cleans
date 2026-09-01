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

/**
 * Tolerant string read for OPTIONAL generated slots: a missing slot returns
 * undefined instead of throwing (unlike s()/sl(), which is right for slots
 * every city is guaranteed to have). Area-page copy has a template fallback
 * for exactly this reason — migrated cities (Minneapolis) carry suburb
 * research with empty subdivisions/conditions and never ran the suburb
 * generation stage, so their `suburb.<slug>.*` slots don't exist at all.
 * Reading them with s() would throw on every one of those live pages.
 */
export function sOpt(c: CityContent, id: string): string | undefined {
  const v = c.sections[id]
  return typeof v === 'string' ? v : undefined
}

/**
 * The three slot ids one area page owns: hero intro, house-cleaning "homes"
 * copy, and local-conditions copy. Single source of truth for
 * src/pipeline/stages.ts (stageSlots, regenerateStage's clearing loop, and
 * executeStage's suburb case, which WRITES these) and src/data/suburb.ts
 * (which READS them) — a mismatch here is silent everywhere else.
 *
 * Lives here rather than in src/pipeline/stages.ts so the render path
 * (src/data/suburb.ts) can import just the slot-id contract without pulling
 * in the pipeline's model client, draft store, and progress-log machinery.
 * src/pipeline/stages.ts re-exports this rather than defining its own copy.
 */
export function suburbSlots(slug: string): readonly string[] {
  return [`suburb.${slug}.intro`, `suburb.${slug}.homes`, `suburb.${slug}.local`]
}
