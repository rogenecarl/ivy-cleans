// src/content/slots.ts
/*
 * Render-time slot accessors. Unlike Plan 1's module-eval accessors, these
 * take the city document explicitly, so a bad document fails the REQUEST
 * (or the per-city build) — never the whole process (Plan 1 review #8).
 */
import type { CityContent } from './types'
import type { ResearchOutput } from '../pipeline/schemas'

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
 *
 * A blank or whitespace-only value is treated the same as absent (see
 * isWrittenSlot below): SuburbCopySchema carries no min-length constraint,
 * so a model can return `""` for a slot, and that string IS `typeof
 * === 'string'`. Without this, src/data/suburb.ts would render an empty
 * `<p>` on a live area page instead of falling back to the template.
 */
export function sOpt(c: CityContent, id: string): string | undefined {
  const v = c.sections[id]
  return isWrittenSlot(v) && typeof v === 'string' ? v : undefined
}

/**
 * The one notion of "a slot holds real content" shared by the suburb
 * generation loop (src/pipeline/stages.ts), finalizeDraft's missing-slot
 * check (src/content/drafts.ts), and sOpt above. A string only counts if it
 * has non-whitespace content — SuburbCopySchema has no min-length
 * constraint (the structured-output API rejects that constraint on
 * strings), so a model can return `""`, and `"" !== undefined` is true. An
 * array slot (e.g. services.heroParagraphs) has no such failure mode from
 * this pipeline, so any array — including an empty one, which is a
 * legitimate answer for e.g. subdivisions — counts as written once present.
 */
export function isWrittenSlot(value: string | string[] | undefined): boolean {
  if (typeof value === 'string') return value.trim() !== ''
  return value !== undefined
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

/**
 * The four pipeline stages. Moved here from src/pipeline/stages.ts (Task 18)
 * together with StageId/STAGE_IDS/stageSlots so that src/content/drafts.ts
 * (which needs stageSlots for requiredSlotsFor) does not have to import
 * src/pipeline/stages.ts — and src/pipeline/stages.ts imports loadDraft/
 * saveDraft from drafts.ts, so that import would be a genuine ESM cycle.
 * It worked only by accident (every binding pulled from it was used inside a
 * function body, never at module-eval time); the first top-level use of a
 * cycle-imported binding turns that accident into a TypeError at import.
 * src/pipeline/stages.ts re-exports all four below so its public surface is
 * unchanged for every other importer.
 */
export const STAGES = [
  { id: 'research', label: 'Researching the city — suburbs, ZIP codes, local conditions' },
  { id: 'front', label: 'Writing the front page — hero and services' },
  { id: 'deep', label: 'Writing the deep-cleaning page' },
  { id: 'suburb', label: 'Writing the area pages' },
] as const

export type StageId = (typeof STAGES)[number]['id']

export const STAGE_IDS: readonly StageId[] = STAGES.map((s) => s.id)

/**
 * Section slots each stage owns. regenerateStage() deletes exactly these
 * before re-running, so a regenerate never leaves half of an older draft
 * mixed into a newer one. `research` owns no section slots — it owns the
 * `draft.research` object instead (see clearStageOutputs in stages.ts).
 *
 * A function of the research rather than a static map: the suburb stage
 * writes three slots PER AREA, and how many areas there are isn't known
 * until research has run. With `research` undefined (research hasn't run
 * yet), `suburb` is `[]` — there is nothing yet to own or to clear.
 *
 * The union of stageSlots(research) across all stages must equal
 * drafts.ts requiredSlotsFor(research) exactly: any slot a stage does not
 * own could never be regenerated, and any slot no stage writes would block
 * finalizeDraft forever. Pinned by a test.
 */
export function stageSlots(research: ResearchOutput | undefined): Record<StageId, readonly string[]> {
  return {
    research: [],
    front: [
      'services.heroParagraphs',
      'services.serviceIntro',
      'services.cards.dusting',
      'services.cards.vacuuming',
      'services.cards.bathroom',
      'services.cards.window',
      'services.cards.upholstery',
    ],
    deep: ['deep.whatIs'],
    suburb: research ? research.suburbs.flatMap((s) => suburbSlots(s.slug)) : [],
  }
}
