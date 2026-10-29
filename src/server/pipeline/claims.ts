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

const NOT_ACCEPTED: ReadonlySet<ClaimStatus> = new Set(['unconfirmed', 'wrong', 'dropped'])

/** Place names (areas, subdivisions, ZIPs) the copy must not use: found case-insensitively, as whole words. */
export function blockedNames(text: string, claims: readonly ResearchClaim[]): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const c of claims) {
    if (!NOT_ACCEPTED.has(c.status) || (c.kind !== 'area' && c.kind !== 'subdivision' && c.kind !== 'zip')) continue
    const escaped = c.text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(lower) && !found.includes(c.text)) found.push(c.text)
  }
  return found
}

/** How research compares with a known list of areas → subdivisions (names as the list writes them; case ignored). */
export function agreement(
  research: ResearchOutput,
  known: Record<string, readonly string[]>,
): { matched: number; extra: string[]; missing: string[] } {
  const lc = (s: string) => s.trim().toLowerCase()
  const knownAreas = new Map(Object.entries(known).map(([name, subs]) => [lc(name), { name, subs }]))
  let matched = 0
  const extra: string[] = []
  const missing: string[] = []
  const extraSubs: string[] = []
  const missingSubs: string[] = []
  for (const s of research.suburbs) {
    const k = knownAreas.get(lc(s.name))
    if (!k) {
      extra.push(s.name)
      continue
    }
    matched += 1
    const knownSubs = new Set(k.subs.map(lc))
    for (const d of s.subdivisions) {
      if (knownSubs.has(lc(d))) matched += 1
      else extraSubs.push(`${s.name} › ${d}`)
    }
    const found = new Set(s.subdivisions.map(lc))
    for (const d of k.subs) if (!found.has(lc(d))) missingSubs.push(`${s.name} › ${d}`)
  }
  const researched = new Set(research.suburbs.map((s) => lc(s.name)))
  for (const [key, k] of knownAreas) if (!researched.has(key)) missing.push(k.name)
  return { matched, extra: [...extra, ...extraSubs], missing: [...missing, ...missingSubs] }
}
