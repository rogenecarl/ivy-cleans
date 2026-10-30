// The research stage, step by step: the whole stage takes half an hour, and a serverless request is stopped long before
// that. Each step is one model call, saved as it lands, so a step that dies is the only thing lost.

import { MODELS, SEARCH_BUDGET, type ModelClient, type ResearchEvent } from '@/server/pipeline/model'
import { appendProgress } from '@/server/pipeline/progress'
import { asResearchResult, mergeSources, type ResearchResult } from '@/server/pipeline/sources'
import { acceptedResearch, researchFromClaims, toResearchAndClaims } from '@/server/pipeline/claims'
import { ResearchStructuredSchema } from '@/server/pipeline/schemas'
import { saveDraft, type DraftDoc } from '@/server/content/drafts'
import {
  RESEARCH_STRUCTURE_SYSTEM,
  buildAreaResearchPrompt,
  buildAreasResearchPrompt,
  buildMetroResearchPrompt,
  buildResearchStructuringPrompt,
  composeFindings,
} from './prompts'
import {
  AreaListSchema,
  MAX_AREAS,
  MODEL_KEYS,
  applyUniquenessGate,
  normalizeResearchSlugs,
  normalizeSlug,
} from './research'

const areaPart = (name: string) => `area:${normalizeSlug(name)}`

// what is still owed, in order. The areas are unknown until the area list exists, so the list grows: ask again when it runs out.
export function pendingResearchItems(draft: DraftDoc): { slug: string; name: string }[] {
  if (draft.research) return []
  const parts = draft.researchParts ?? {}
  const items: { slug: string; name: string }[] = []
  if (parts.metro === undefined) items.push({ slug: 'metro', name: `${draft.facts.city} as a whole` })
  if (parts.areas === undefined) items.push({ slug: 'areas', name: `The areas ${draft.facts.city} serves` })
  const names = draft.researchAreaNames
  if (names === undefined) return [...items, { slug: 'area-list', name: 'Listing the areas' }]
  for (const name of names) {
    if (parts[areaPart(name)] === undefined) items.push({ slug: areaPart(name), name })
  }
  return [...items, { slug: 'structure', name: 'Organising the findings' }]
}

type StepArgs = { client: ModelClient; key: string; draft: DraftDoc; item: string }

export async function researchStep({ client, key, draft, item }: StepArgs): Promise<void> {
  const { facts } = draft
  if (draft.researchParts === undefined) {
    await appendProgress(key, {
      stage: 'research',
      kind: 'start',
      label: `Researching ${facts.city}: the city, its areas, then each area in turn`,
    })
  }
  const parts = (draft.researchParts ??= {})

  // a repeated request (a retry, a second tab) finds the step already saved
  const pass = async (modelKey: string, prompt: string, maxSearches: number, label: string) => {
    if (parts[item] !== undefined) return
    const onEvent = (e: ResearchEvent) => {
      // sync callback; the per-key progress chain serialises the writes
      void appendProgress(key, { stage: 'research', kind: e.kind, label: e.label }).catch(() => {})
    }
    await appendProgress(key, { stage: 'research', kind: 'search', label })
    parts[item] = await client.research(prompt, modelKey, onEvent, { maxSearches })
    await saveDraft(key, draft)
  }

  if (item === 'metro') {
    await pass(MODEL_KEYS.researchMetro, buildMetroResearchPrompt(facts), SEARCH_BUDGET.metro, `${facts.city} as a whole: climate, housing, conditions`)
    return
  }
  if (item === 'areas') {
    await pass(MODEL_KEYS.researchAreas, buildAreasResearchPrompt(facts), SEARCH_BUDGET.areas, `The areas ${facts.city} serves`)
    return
  }
  if (item === 'area-list') {
    if (draft.researchAreaNames !== undefined) return
    await listAreas(client, draft)
    await saveDraft(key, draft)
    return
  }
  if (item === 'structure') {
    await structure(client, key, draft)
    return
  }
  const name = draft.researchAreaNames?.find((n) => areaPart(n) === item)
  if (name === undefined) throw new Error(`unknown research step "${item}" for "${key}"`)
  const slug = normalizeSlug(name)
  await pass(MODEL_KEYS.researchArea(slug), buildAreaResearchPrompt(facts, name, draft.researchAreaNames ?? []), SEARCH_BUDGET.area, `${name}: subdivisions, housing, conditions`)
}

async function listAreas(client: ModelClient, draft: DraftDoc): Promise<void> {
  const { facts, researchParts: parts = {} } = draft
  if (parts.areas === undefined) throw new Error(`research step "area-list" needs the areas pass first`)
  const { areas } = await client.generate({
    schema: AreaListSchema,
    key: MODEL_KEYS.researchAreaList,
    system: RESEARCH_STRUCTURE_SYSTEM,
    prompt: `Below are research findings listing the areas a cleaning company serves. Return each area's name exactly as the findings write it, in the order found, nothing else.\n\nFINDINGS\n${asResearchResult(parts.areas).text}`,
    model: MODELS.research,
  })
  // the brief asks for 8 to 10; the model sometimes lists more, and every extra area is a research pass and a page
  const names = [...new Set(areas.map((a) => a.name.trim()).filter((n) => n !== ''))].slice(0, MAX_AREAS)
  if (names.length === 0) {
    throw new Error(`research found no areas for ${facts.city} — the areas pass returned nothing usable; re-run research`)
  }
  draft.researchAreaNames = names
}

async function structure(client: ModelClient, key: string, draft: DraftDoc): Promise<void> {
  if (draft.research) return
  const { facts, researchParts: parts = {}, researchAreaNames: areaNames } = draft
  const owed = pendingResearchItems(draft).filter((i) => i.slug !== 'structure')
  if (areaNames === undefined || parts.metro === undefined || parts.areas === undefined || owed.length > 0) {
    throw new Error(`research step "structure" for "${key}" needs ${owed.map((i) => i.slug).join(', ')} first`)
  }

  const perArea: Record<string, ResearchResult> = {}
  for (const name of areaNames) perArea[`area:${name}`] = asResearchResult(parts[areaPart(name)])
  const merged = mergeSources({ metro: asResearchResult(parts.metro), areas: asResearchResult(parts.areas), ...perArea })
  const findings = composeFindings(
    {
      metro: merged.texts.metro,
      areas: merged.texts.areas,
      perArea: Object.fromEntries(areaNames.map((name) => [name, merged.texts[`area:${name}`]])),
    },
    merged.sources,
  )
  draft.sources = merged.sources
  // persist the raw findings before structuring: the only evidence of what research found
  draft.findings = findings
  await saveDraft(key, draft)

  await appendProgress(key, {
    stage: 'research',
    kind: 'found',
    label: `Collected ${findings.length.toLocaleString()} chars of findings — structuring`,
  })
  const structured = await client.generate({
    schema: ResearchStructuredSchema,
    key: MODEL_KEYS.researchStructure,
    system: RESEARCH_STRUCTURE_SYSTEM,
    prompt: buildResearchStructuringPrompt(findings, facts, []),
    model: MODELS.research,
  })
  for (const s of structured.suburbs) s.slug = normalizeSlug(s.slug)
  const sourced = toResearchAndClaims(structured, new Set(merged.sources.map((s) => s.id)))
  const normalized = normalizeResearchSlugs(sourced.research, facts.city)
  const kept = new Set(normalized.suburbs.map((s) => s.slug))
  draft.researchFull = normalized
  draft.claims = sourced.claims.filter((c) => c.area === null || kept.has(c.area))
  // the gate runs here, before anything downstream can see a skipped area
  const { scored } = applyUniquenessGate(acceptedResearch(normalized, draft.claims))
  const r = researchFromClaims(normalized, draft.claims)
  draft.research = r
  const skipped = scored.filter((s) => s.verdict === 'skip')
  // subdivisions, not landmarks, are the count that matters
  const subdivisionCount = r.suburbs.reduce((n, s) => n + s.subdivisions.length, 0)
  await appendProgress(key, {
    stage: 'research',
    kind: 'found',
    label: `${r.suburbs.length} areas · ${r.zips.length} ZIP codes · ${subdivisionCount} subdivisions · ${r.keywords.length} search phrases`,
  })
  // the line an operator reads: 'X of Y' so the arithmetic reconciles
  await appendProgress(key, {
    stage: 'research',
    kind: 'found',
    label:
      `${r.suburbs.length} of ${scored.length} areas will get a page` +
      (skipped.length ? ` · no developments found for ${skipped.map((s) => s.suburb.name).join(', ')}` : ''),
  })
  await appendProgress(key, { stage: 'research', kind: 'done', label: 'Research complete' })
}
