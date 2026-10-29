// Research claims: every place and local fact research produced, with the sources behind it and whether it has been
// checked. Writers never read claims; they read a ResearchOutput rebuilt from the accepted ones.
import { citySlug } from '@/server/content/interpolate'
import type { Condition, ResearchOutput, ResearchStructured, Suburb } from '@/server/pipeline/schemas'
import { applyUniquenessGate, linkNeighbors } from '@/server/pipeline/stages/research'

export type ClaimKind = 'area' | 'subdivision' | 'housing' | 'condition' | 'zip'

// unchecked = a copySafe:false condition: never printed, so never checked and never waiting on a decision
export type ClaimStatus = 'pending' | 'confirmed' | 'unconfirmed' | 'wrong' | 'kept' | 'dropped' | 'unchecked'

export type ResearchClaim = {
  id: string
  /** area slug; null = city-wide */
  area: string | null
  kind: ClaimKind
  text: string
  sources: string[]
  status: ClaimStatus
  /** one line for the operator: why it is unconfirmed or wrong */
  reason?: string
}

export const ACCEPTED: ReadonlySet<ClaimStatus> = new Set(['pending', 'confirmed', 'kept', 'unchecked'])

export function claimId(area: string | null, kind: ClaimKind, text: string): string {
  return `${area ?? '_city'}:${kind}:${citySlug(text)}`
}

// only source ids that exist count; an item with none is dropped before anything downstream sees it
export function toResearchAndClaims(
  structured: ResearchStructured,
  sourceIds: ReadonlySet<string>,
): { research: ResearchOutput; claims: ResearchClaim[] } {
  const claims: ResearchClaim[] = []
  const valid = (ids: readonly string[]) => ids.filter((id) => sourceIds.has(id))
  const claim = (area: string | null, kind: ClaimKind, text: string, sources: string[], status: ClaimStatus = 'pending') =>
    claims.push({ id: claimId(area, kind, text), area, kind, text, sources, status })
  const conditions = (area: string | null, list: ResearchStructured['conditions']): Condition[] =>
    list.flatMap((c) => {
      const sources = valid(c.sources)
      if (sources.length === 0) return []
      claim(area, 'condition', c.condition, sources, c.copySafe ? 'pending' : 'unchecked')
      return [{ condition: c.condition, implication: c.implication, copySafe: c.copySafe }]
    })

  const suburbs: Suburb[] = []
  for (const s of structured.suburbs) {
    const areaSources = valid(s.sources)
    if (areaSources.length === 0) continue
    claim(s.slug, 'area', s.name, areaSources)
    const subdivisions = s.subdivisions.flatMap((d) => {
      const sources = valid(d.sources)
      if (sources.length === 0) return []
      claim(s.slug, 'subdivision', d.name, sources)
      return [d.name]
    })
    const housingSources = valid(s.housing.sources)
    const housing = s.housing.text.trim() !== '' && housingSources.length > 0 ? s.housing.text : ''
    if (housing) claim(s.slug, 'housing', housing, housingSources)
    suburbs.push({
      name: s.name,
      slug: s.slug,
      subdivisions,
      housingCharacter: housing,
      neighbors: s.neighbors,
      conditions: conditions(s.slug, s.conditions),
    })
  }

  const zips = structured.zips.flatMap((z) => {
    const sources = valid(z.sources)
    if (sources.length === 0) return []
    claim(null, 'zip', z.zip, sources)
    return [z.zip]
  })

  return {
    research: { suburbs, conditions: conditions(null, structured.conditions), zips, keywords: structured.keywords },
    claims,
  }
}

// the research a writer may see: only accepted claims, before the uniqueness gate
export function acceptedResearch(full: ResearchOutput, claims: readonly ResearchClaim[]): ResearchOutput {
  const ok = new Set(claims.filter((c) => ACCEPTED.has(c.status)).map((c) => c.id))
  const known = new Set(claims.map((c) => c.id))
  // an item with no claim at all (legacy research) is kept as it was
  const keep = (area: string | null, kind: ClaimKind, text: string) => {
    const id = claimId(area, kind, text)
    return !known.has(id) || ok.has(id)
  }
  return {
    ...full,
    suburbs: full.suburbs
      .filter((s) => keep(s.slug, 'area', s.name))
      .map((s) => ({
        ...s,
        subdivisions: s.subdivisions.filter((d) => keep(s.slug, 'subdivision', d)),
        housingCharacter: s.housingCharacter && keep(s.slug, 'housing', s.housingCharacter) ? s.housingCharacter : '',
        conditions: s.conditions.filter((c) => keep(s.slug, 'condition', c.condition)),
      })),
    conditions: full.conditions.filter((c) => keep(null, 'condition', c.condition)),
    zips: full.zips.filter((z) => keep(null, 'zip', z)),
  }
}

/** acceptedResearch, then the uniqueness gate and neighbour links, as the research stage does. */
export function researchFromClaims(full: ResearchOutput, claims: readonly ResearchClaim[]): ResearchOutput {
  return linkNeighbors(applyUniquenessGate(acceptedResearch(full, claims)).research)
}
