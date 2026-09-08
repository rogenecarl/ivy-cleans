// src/content/slots.ts
// Render-time slot accessors; take the document explicitly so a bad document fails that request only
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

// optional slot read: undefined instead of throwing (Minneapolis has no generated area copy). Blank counts as absent.
export function sOpt(c: CityContent, id: string): string | undefined {
  const v = c.sections[id]
  return isWrittenSlot(v) && typeof v === 'string' ? v : undefined
}

// 'holds real content': a non-blank string, or any array (empty is a legitimate answer)
export function isWrittenSlot(value: string | string[] | undefined): boolean {
  if (typeof value === 'string') return value.trim() !== ''
  return value !== undefined
}

// the three slot ids an area page owns; the pipeline writes them, src/data/suburb.ts reads them
export function suburbSlots(slug: string): readonly string[] {
  return [`suburb.${slug}.intro`, `suburb.${slug}.homes`, `suburb.${slug}.local`]
}

// template services with a generated local paragraph. Declared here, not imported from the registry (ESM cycle);
// a test pins it to the registry. Move-out is bespoke and absent on purpose.
export const SERVICE_LOCAL_SLUGS = [
  'standard-cleaning',
  'deep-cleaning',
  'apartment-cleaning',
  'airbnb-cleaning',
  'post-construction-cleaning',
  'pre-listing-cleaning',
] as const

// the slot a service page's local section lives in; read with sOpt, never s
export function serviceSlots(slug: string): readonly string[] {
  return [`service.${slug}.local`]
}

// the four stages. Here rather than pipeline/stages.ts so drafts.ts can import without a cycle; stages.ts re-exports.
export const STAGES = [
  { id: 'research', label: 'Researching the city — suburbs, ZIP codes, local conditions' },
  { id: 'front', label: 'Writing the front page — hero and services' },
  { id: 'suburb', label: 'Writing the area pages' },
  { id: 'service', label: 'Writing the local section of each service page' },
] as const

export type StageId = (typeof STAGES)[number]['id']

export const STAGE_IDS: readonly StageId[] = STAGES.map((s) => s.id)

// slots each stage owns; regenerateStage deletes exactly these. A function of research: suburb writes three per area.
// The union across stages must equal requiredSlotsFor(research) — pinned by a test.
// can this area get a page? No subdivisions = no. Three consumers must agree: the suburb loop, stageComplete, stageSlots.
export function isWritableArea(suburb: { subdivisions: readonly string[] }): boolean {
  return suburb.subdivisions.length > 0
}

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
    suburb: research ? research.suburbs.filter(isWritableArea).flatMap((s) => suburbSlots(s.slug)) : [],
    // Not a function of research, unlike suburb: the services are the same
    // seven in every city, so all six are owed from the moment a draft exists.
    service: SERVICE_LOCAL_SLUGS.flatMap((slug) => serviceSlots(slug)),
  }
}
