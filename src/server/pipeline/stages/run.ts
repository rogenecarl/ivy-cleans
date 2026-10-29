// Stage execution: run, resume and regenerate a stage against the draft sidecar.

import {
  FrontSectionsSchema,
  ResearchStructuredSchema,
  ServiceCopySchema,
  SuburbCopySchema,
  type ResearchOutput,
} from '@/server/pipeline/schemas'
import { MODELS, SEARCH_BUDGET, type ModelClient, type ResearchEvent } from '@/server/pipeline/model'
import { appendProgress, clearProgress } from '@/server/pipeline/progress'
import { asResearchResult, mergeSources, type ResearchResult } from '@/server/pipeline/sources'
import { acceptedResearch, blockedNames, researchFromClaims, toResearchAndClaims } from '@/server/pipeline/claims'
import { makeGeocoder, type Geocoder } from '@/server/pipeline/geo'
import { pendingVerifyItems, verifyItem } from './verify'
import { loadDraft, saveDraft, type DraftDoc } from '@/server/content/drafts'
import {
  SERVICE_LOCAL_SLUGS,
  isWritableArea,
  isWrittenSlot,
  serviceSlots,
  stageSlots,
  suburbSlots,
  type StageId,
} from '@/server/content/slots'
import { serviceBySlug } from '@/site/data/services/registry'
import { MAX_SERVICE_LINKS, MAX_SUBURB_LINKS, acceptLinks } from '@/server/content/links'
import {
  FRONT_SYSTEM,
  RESEARCH_STRUCTURE_SYSTEM,
  SERVICE_SYSTEM,
  SUBURB_SYSTEM,
  buildAreaResearchPrompt,
  buildAreasResearchPrompt,
  buildFrontPrompt,
  buildMetroResearchPrompt,
  buildResearchStructuringPrompt,
  buildServiceLocalPrompt,
  buildSuburbPrompt,
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

// written copy that names a place the check did not accept is refused before any of it is saved
function refuseBlockedNames(draft: DraftDoc, item: string, texts: ReadonlyArray<string | readonly string[]>): void {
  const names = blockedNames(texts.flat().join('\n'), draft.claims ?? [])
  if (names.length > 0) {
    throw new Error(`the copy for ${item} names "${names[0]}", which was not confirmed — regenerate it`)
  }
}

function requireResearch(draft: DraftDoc, key: string, stage: StageId): ResearchOutput {
  const undecided = (draft.claims ?? []).filter((c) => c.status === 'unconfirmed').length
  if (undecided > 0) {
    throw new Error(`cannot run stage "${stage}" for "${key}": ${undecided} research facts still need a decision`)
  }
  if (!draft.research) {
    throw new Error(`cannot run stage "${stage}" for "${key}": the research stage has not completed`)
  }
  return draft.research
}

async function executeStage(
  client: ModelClient,
  key: string,
  draft: DraftDoc,
  stage: StageId,
  only: string | undefined,
  geocoder: Geocoder,
): Promise<void> {
  const { facts } = draft

  switch (stage) {
    case 'research': {
      await appendProgress(key, {
        stage: 'research',
        kind: 'start',
        label: `Researching ${facts.city}: the city, its areas, then each area in turn`,
      })
      const parts = (draft.researchParts ??= {})
      const onEvent = (e: ResearchEvent) => {
        // sync callback; the per-key progress chain serialises the writes
        void appendProgress(key, { stage: 'research', kind: e.kind, label: e.label }).catch(() => {})
      }
      // one pass, saved as soon as it lands so an interrupted stage resumes here
      const pass = async (partKey: string, modelKey: string, prompt: string, maxSearches: number, label: string) => {
        const stored = parts[partKey]
        if (stored !== undefined) return asResearchResult(stored)
        await appendProgress(key, { stage: 'research', kind: 'search', label })
        const result = await client.research(prompt, modelKey, onEvent, { maxSearches })
        parts[partKey] = result
        await saveDraft(key, draft)
        return result
      }

      const metroResult = await pass('metro', MODEL_KEYS.researchMetro, buildMetroResearchPrompt(facts), SEARCH_BUDGET.metro, `${facts.city} as a whole: climate, housing, conditions`)
      const areasResult = await pass('areas', MODEL_KEYS.researchAreas, buildAreasResearchPrompt(facts), SEARCH_BUDGET.areas, `The areas ${facts.city} serves`)
      const { areas } = await client.generate({
        schema: AreaListSchema,
        key: MODEL_KEYS.researchAreaList,
        system: RESEARCH_STRUCTURE_SYSTEM,
        prompt: `Below are research findings listing the areas a cleaning company serves. Return each area's name exactly as the findings write it, in the order found, nothing else.\n\nFINDINGS\n${areasResult.text}`,
        model: MODELS.research,
      })
      // the brief asks for 8 to 10; the model sometimes lists more, and every extra area is a research pass and a page
      const areaNames = [...new Set(areas.map((a) => a.name.trim()).filter((n) => n !== ''))].slice(0, MAX_AREAS)
      if (areaNames.length === 0) {
        throw new Error(`research found no areas for ${facts.city} — the areas pass returned nothing usable; re-run research`)
      }
      const perArea: Record<string, ResearchResult> = {}
      for (const name of areaNames) {
        perArea[name] = await pass(`area:${normalizeSlug(name)}`, MODEL_KEYS.researchArea(normalizeSlug(name)), buildAreaResearchPrompt(facts, name, areaNames), SEARCH_BUDGET.area, `${name}: subdivisions, housing, conditions`)
      }
      const merged = mergeSources({
        metro: metroResult,
        areas: areasResult,
        ...Object.fromEntries(Object.entries(perArea).map(([name, r]) => [`area:${name}`, r])),
      })
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
          (skipped.length
            ? ` · no developments found for ${skipped.map((s) => s.suburb.name).join(', ')}`
            : ''),
      })
      await appendProgress(key, { stage: 'research', kind: 'done', label: 'Research complete' })
      break
    }
    case 'verify': {
      // one item per request from the browser; `only` names it. Without `only` every item runs (tests, scripts).
      const items = only === undefined ? pendingVerifyItems(draft) : [only]
      if (items.length > 0 && !draft.claims?.some((c) => c.status !== 'pending')) {
        await appendProgress(key, { stage: 'verify', kind: 'start', label: 'Checking each fact against the page it came from' })
      }
      for (const item of items) {
        await verifyItem({ client, geocoder, draft, item })
        await saveDraft(key, draft)
      }
      if (stageComplete(draft, stage)) {
        const claims = draft.claims ?? []
        const confirmed = claims.filter((c) => c.status === 'confirmed').length
        const open = claims.filter((c) => c.status === 'unconfirmed').length
        const label = claims.length === 0
          ? 'Researched before fact checking existed — nothing to check'
          : `${confirmed} of ${claims.filter((c) => c.status !== 'unchecked').length} facts confirmed` +
            (open ? ` · ${open} need your decision` : '')
        await appendProgress(key, { stage: 'verify', kind: 'done', label })
      }
      break
    }
    case 'front': {
      const research = requireResearch(draft, key, stage)
      await appendProgress(key, {
        stage: 'front',
        kind: 'start',
        label: `Writing hero and services copy for ${facts.city}`,
      })
      const out = await client.generate({
        schema: FrontSectionsSchema,
        key: MODEL_KEYS.front,
        system: FRONT_SYSTEM,
        prompt: buildFrontPrompt(facts, research),
      })
      refuseBlockedNames(draft, 'the front page', [out.heroParagraphs, out.serviceIntro, ...Object.values(out.cards)])
      draft.sections['services.heroParagraphs'] = out.heroParagraphs
      draft.sections['services.serviceIntro'] = out.serviceIntro
      draft.sections['services.cards.dusting'] = out.cards.dusting
      draft.sections['services.cards.vacuuming'] = out.cards.vacuuming
      draft.sections['services.cards.bathroom'] = out.cards.bathroom
      draft.sections['services.cards.window'] = out.cards.window
      draft.sections['services.cards.upholstery'] = out.cards.upholstery
      await appendProgress(key, {
        stage: 'front',
        kind: 'done',
        label: `${out.heroParagraphs.length} hero paragraphs · ${out.serviceIntro.length} intro paragraphs · 5 service cards`,
      })
      break
    }
    case 'suburb': {
      // the only multi-call stage, so it resumes inside itself
      const research = requireResearch(draft, key, stage)

      // `only` runs a single area; the admin drives the loop one area per request
      const targets = only === undefined ? research.suburbs : research.suburbs.filter((s) => s.slug === only)
      if (only !== undefined && targets.length === 0) {
        throw new Error(`cannot write area "${only}" for "${key}": no such area in this city's research`)
      }

      // Announce once per stage, not once per area: with a client-driven loop
      // this case is entered N times and N "starting" lines is noise.
      const anyWritten = research.suburbs.some((s) =>
        suburbSlots(s.slug).some((slot) => isWrittenSlot(draft.sections[slot]))
      )
      if (!anyWritten) {
        await appendProgress(key, {
          stage: 'suburb',
          kind: 'start',
          label: `Writing ${research.suburbs.length} area pages for ${facts.city}`,
        })
      }

      for (const suburb of targets) {
        const [introSlot, homesSlot, localSlot] = suburbSlots(suburb.slug)

        // already written: skip. A blank string is NOT written.
        if (isWrittenSlot(draft.sections[introSlot]) && isWrittenSlot(draft.sections[homesSlot]) && isWrittenSlot(draft.sections[localSlot])) {
          continue
        }

        // check the precondition instead of catching: a try/catch would swallow real API errors
        if (!isWritableArea(suburb)) {
          await appendProgress(key, {
            stage: 'suburb',
            kind: 'found',
            label: `${suburb.name} — skipped, no subdivisions researched`,
          })
          continue
        }

        const out = await client.generate({
          schema: SuburbCopySchema,
          key: MODEL_KEYS.suburb(suburb.slug),
          system: SUBURB_SYSTEM,
          prompt: buildSuburbPrompt(facts, research, suburb),
        })

        refuseBlockedNames(draft, `the ${suburb.name} page`, [out.intro, out.homes, out.local])
        draft.sections[introSlot] = out.intro
        draft.sections[homesSlot] = out.homes
        draft.sections[localSlot] = out.local

        const slotOf = { intro: introSlot, homes: homesSlot, local: localSlot } as const
        for (const slot of [introSlot, homesSlot, localSlot]) delete draft.links?.[slot]
        const accepted = acceptLinks(
          out.links.map((l) => ({ slot: slotOf[l.slot], anchor: l.anchor, href: `/services/${l.service}` })),
          { [introSlot]: out.intro, [homesSlot]: out.homes, [localSlot]: out.local },
          MAX_SUBURB_LINKS
        )
        if (Object.keys(accepted).length > 0) draft.links = { ...(draft.links ?? {}), ...accepted }

        // Save per area: this is what makes the loop resumable.
        await saveDraft(key, draft)

        await appendProgress(key, {
          stage: 'suburb',
          kind: 'found',
          label: `${suburb.name} — ${suburb.subdivisions.length} developments named`,
        })
      }

      if (stageComplete(draft, stage)) {
        await appendProgress(key, {
          stage: 'suburb',
          kind: 'done',
          label: `${research.suburbs.length} area pages written`,
        })
      }
      break
    }
    case 'service': {
      // the one per-city paragraph on each template service page; resumable, drivable one service at a time
      const research = requireResearch(draft, key, stage)

      const targets =
        only === undefined ? [...SERVICE_LOCAL_SLUGS] : SERVICE_LOCAL_SLUGS.filter((slug) => slug === only)
      if (only !== undefined && targets.length === 0) {
        throw new Error(
          `cannot write the local section for "${only}": it is not a service that renders through the shared template. The seven services are fixed; move-in-move-out-cleaning is bespoke and owns no slot.`
        )
      }

      // Announced once per stage, not once per service: with a client-driven
      // loop this case is entered N times and N "starting" lines is noise.
      const anyWritten = SERVICE_LOCAL_SLUGS.some((slug) =>
        serviceSlots(slug).some((slot) => isWrittenSlot(draft.sections[slot]))
      )
      if (!anyWritten) {
        await appendProgress(key, {
          stage: 'service',
          kind: 'start',
          label: `Writing the ${facts.city} section of ${SERVICE_LOCAL_SLUGS.length} service pages`,
        })
      }

      for (const slug of targets) {
        const [localSlot] = serviceSlots(slug)

        // already written: skip. A blank string is NOT written.
        if (isWrittenSlot(draft.sections[localSlot])) continue

        const out = await client.generate({
          schema: ServiceCopySchema,
          key: MODEL_KEYS.service(slug),
          system: SERVICE_SYSTEM,
          prompt: buildServiceLocalPrompt(facts, research, slug),
        })

        refuseBlockedNames(draft, `the ${slug} page`, [out.local])
        draft.sections[localSlot] = out.local

        delete draft.links?.[localSlot]
        const areaSlug = new Map(research.suburbs.map((s) => [s.name.trim().toLowerCase(), s.slug]))
        const accepted = acceptLinks(
          out.links.flatMap((l) => {
            const area = l.area.trim().toLowerCase()
            const slug = areaSlug.get(area)
            return slug !== undefined && l.anchor.toLowerCase().includes(area)
              ? [{ slot: localSlot, anchor: l.anchor, href: `/${slug}` }]
              : []
          }),
          { [localSlot]: out.local },
          MAX_SERVICE_LINKS
        )
        if (accepted[localSlot]) draft.links = { ...(draft.links ?? {}), ...accepted }

        // Save per service: this is what makes the loop resumable.
        await saveDraft(key, draft)

        await appendProgress(key, {
          stage: 'service',
          kind: 'found',
          label: `${serviceBySlug(slug)?.name ?? slug} — local section written`,
        })
      }

      if (stageComplete(draft, stage)) {
        await appendProgress(key, {
          stage: 'service',
          kind: 'done',
          label: `${SERVICE_LOCAL_SLUGS.length} service pages given a ${facts.city} section`,
        })
      }
      break
    }
    default: {
      const exhaustive: never = stage
      throw new Error(`unknown stage "${String(exhaustive)}"`)
    }
  }

  // done when every owned slot holds real copy, not when executeStage returned
  if (!draft.done.includes(stage) && stageComplete(draft, stage)) draft.done.push(stage)
  await saveDraft(key, draft)
}

// every owned slot holds real copy; un-writable areas excluded
function stageComplete(draft: DraftDoc, stage: StageId): boolean {
  if (stage === 'verify') return !(draft.claims ?? []).some((c) => c.status === 'pending')
  // stageSlots already excludes un-writable areas, so this and finalize's
  // requiredSlotsFor now demand exactly the same set — the whole point.
  return stageSlots(draft.research)[stage].every((slot) => isWrittenSlot(draft.sections[slot]))
}

// run one stage unless already done
export async function runStage(
  client: ModelClient,
  key: string,
  stage: StageId,
  only?: string,
  geocoder: Geocoder = makeGeocoder(),
): Promise<void> {
  const draft = await loadDraft(key)
  if (draft.done.includes(stage)) return
  try {
    await executeStage(client, key, draft, stage, only, geocoder)
  } catch (err) {
    const label = err instanceof Error ? err.message : String(err)
    await appendProgress(key, { stage, kind: 'error', label }).catch(() => {})
    throw err
  }
}

// strip a stage's outputs and `done` entry; ownership computed against the draft's own research
function clearStageOutputs(draft: DraftDoc, stage: StageId): void {
  draft.done = draft.done.filter((s) => s !== stage)
  for (const slot of stageSlots(draft.research)[stage]) {
    delete draft.sections[slot]
    delete draft.links?.[slot]
  }
  if (stage === 'research') {
    delete draft.research
    delete draft.findings
    delete draft.researchParts
    delete draft.sources
    delete draft.researchFull
    delete draft.claims
    delete draft.geocodes
  }
}

// re-run a stage (per-item stages are only cleared). Regenerating research also clears front and suburb: both consumed it.
export async function regenerateStage(
  client: ModelClient,
  key: string,
  stage: StageId
): Promise<void> {
  const draft = await loadDraft(key)

  // downstream first, while draft.research still says which slots they own
  const targets: StageId[] = stage === 'research' ? ['verify', 'front', 'suburb', 'service', 'research'] : [stage]
  for (const target of targets) clearStageOutputs(draft, target)
  for (const target of targets) await clearProgress(key, target)

  await saveDraft(key, draft)
  // suburb and service are one model call per item; the generate screen's loop rewrites them one request each
  if (stage === 'suburb' || stage === 'service') return
  await runStage(client, key, stage)
}
