// Research post-processing: slugs, neighbours, and the uniqueness gate.

import { z } from 'zod'
import { type Condition, type ResearchOutput, type Suburb } from '@/server/pipeline/schemas'
import { citySlug } from '@/server/content/interpolate'
import { isWritableArea } from '@/server/content/slots'
import { LEGACY_POST_SLUGS } from '@/data/legacy-posts'

// new cities get a bare `<area>` slug; Minneapolis keeps its stored ones
export const SLUG_PATTERN = '<area>' as const

// ── Stage execution ──

// ModelClient keys, one per call; `suburb` is keyed per area so fixtures can differ per area
// the area names out of the areas pass, so each can get its own research pass
export const MAX_AREAS = 10

export const AreaListSchema = z.object({ areas: z.array(z.object({ name: z.string() }).strict()) }).strict()

export const MODEL_KEYS = {
  researchMetro: 'research.metro',
  researchAreas: 'research.areas',
  researchAreaList: 'research.structure.areas',
  researchArea: (slug: string) => `research.area.${slug}`,
  researchStructure: 'research.structure',
  front: 'front',
  suburb: (slug: string) => `suburb.${slug}`,
  service: (slug: string) => `service.${slug}`,
} as const

// slugs become URLs, so normalise in code: lowercase, non-alphanumerics to hyphens, trimmed
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Route segments that exist for every city; a suburb slug equal to one would be silently shadowed.
// Static leaves under (front)/ and (inner)/, plus every root-level blog post slug.
export function reservedSlugs(cityName: string): Set<string> {
  const slug = citySlug(cityName)
  return new Set([
    'book-now',
    'blog',
    'book',
    'cleaning-services',
    'contact',
    'faq',
    'home',
    'privacy-policy',
    'services',
    ...LEGACY_POST_SLUGS,
    `deep-cleaning-${slug}`,
    `${slug}-move-out-cleaning-services`,
  ])
}

// normalise every slug; drop collisions (first wins), empties and reserved slugs
export function normalizeResearchSlugs(research: ResearchOutput, cityName: string): ResearchOutput {
  const reserved = reservedSlugs(cityName)
  const seen = new Set<string>()
  const suburbs: ResearchOutput['suburbs'] = []
  for (const suburb of research.suburbs) {
    const slug = normalizeSlug(suburb.slug)
    if (slug === '' || seen.has(slug) || reserved.has(slug)) continue
    seen.add(slug)
    // spread the suburb: only slug changes, the research fields must survive
    suburbs.push({ ...suburb, slug })
  }
  return { ...research, suburbs }
}

// ── The uniqueness gate: an area with no distinct local material is a doorway page ──

export type SuburbVerdict = 'build' | 'review' | 'skip'

export interface ScoredSuburb {
  suburb: Suburb
  score: number
  verdict: SuburbVerdict
  reason: string
}

// >= 8 builds, 4-7 goes to the operator, < 4 is cut
const BUILD_THRESHOLD = 8
const REVIEW_THRESHOLD = 4

// distinct, publishable material; only copySafe conditions count
export function scoreSuburb(suburb: Suburb): number {
  const safeConditions = suburb.conditions.filter((c: Condition) => c.copySafe).length
  const housing = suburb.housingCharacter.trim() === '' ? 0 : 2
  return suburb.subdivisions.length + safeConditions + housing
}

export const MAX_NEIGHBORS = 4

// Neighbour names from the model -> slugs of areas that still exist, symmetric, never self, at most MAX_NEIGHBORS,
// kept in research order. Runs after the gate so a dropped area can't be anyone's neighbour.
export function linkNeighbors(research: ResearchOutput): ResearchOutput {
  const order = research.suburbs.map((s) => s.slug)
  const byName = new Map(research.suburbs.map((s) => [s.name.trim().toLowerCase(), s.slug]))
  const bySlug = new Set(order)
  const links = new Map<string, Set<string>>(order.map((slug) => [slug, new Set()]))
  for (const suburb of research.suburbs) {
    for (const raw of suburb.neighbors) {
      const key = raw.trim().toLowerCase()
      const slug = bySlug.has(normalizeSlug(raw)) ? normalizeSlug(raw) : byName.get(key)
      if (slug === undefined || slug === suburb.slug) continue
      links.get(suburb.slug)!.add(slug)
      links.get(slug)!.add(suburb.slug)
    }
  }
  return {
    ...research,
    suburbs: research.suburbs.map((s) => ({
      ...s,
      neighbors: order.filter((slug) => links.get(s.slug)!.has(slug)).slice(0, MAX_NEIGHBORS),
    })),
  }
}

export function scoreSuburbs(research: ResearchOutput): ScoredSuburb[] {
  return research.suburbs.map((suburb) => {
    const score = scoreSuburb(suburb)

    // zero subdivisions disqualifies outright: the homes paragraph needs three
    if (!isWritableArea(suburb)) {
      return {
        suburb,
        score,
        verdict: 'skip',
        reason: 'no subdivisions found; the homes paragraph cannot name real ones without inventing one',
      }
    }

    const verdict: SuburbVerdict =
      score >= BUILD_THRESHOLD ? 'build' : score >= REVIEW_THRESHOLD ? 'review' : 'skip'
    const reason =
      verdict === 'build'
        ? `${suburb.subdivisions.length} subdivisions, ${suburb.conditions.filter((c) => c.copySafe).length} local conditions`
        : verdict === 'review'
          ? 'thin — enough for a page only if search demand justifies it'
          : 'too little distinct local material; a page here would duplicate its siblings'
    return { suburb, score, verdict, reason }
  })
}

// drops 'skip'; keeps 'review' for the operator; returns the full scored list so the caller can report drops
export function applyUniquenessGate(research: ResearchOutput): {
  research: ResearchOutput
  scored: ScoredSuburb[]
} {
  const scored = scoreSuburbs(research)
  const kept = scored.filter((s) => s.verdict !== 'skip').map((s) => s.suburb)
  return { research: { ...research, suburbs: kept }, scored }
}
