// Stage execution: run, resume and regenerate a stage against the draft sidecar.

import {
  FrontSectionsSchema,
  ServiceCopySchema,
  SuburbCopySchema,
  type ResearchOutput,
} from '@/server/pipeline/schemas'
import type { ModelClient } from '@/server/pipeline/model'
import { appendProgress, clearProgress } from '@/server/pipeline/progress'
import { blockedNames } from '@/server/pipeline/claims'
import { makeGeocoder, type Geocoder } from '@/server/pipeline/geo'
import { pendingResearchItems, researchStep } from './research-steps'
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
  SERVICE_SYSTEM,
  SUBURB_SYSTEM,
  buildFrontPrompt,
  buildServiceLocalPrompt,
  buildSuburbPrompt,
} from './prompts'
import { MODEL_KEYS } from './research'

// written copy that names a place the check did not accept is refused before any of it is saved
function refuseBlockedNames(draft: DraftDoc, item: string, texts: ReadonlyArray<string | readonly string[]>): void {
  const names = blockedNames(texts.flat().join('\n'), draft.claims ?? [])
  if (names.length > 0) {
    throw new Error(`the copy for ${item} names "${names[0]}", which was not confirmed — regenerate it`)
  }
}

function requireResearch(draft: DraftDoc, key: string, stage: StageId): ResearchOutput {
  const unchecked = (draft.claims ?? []).filter((c) => c.status === 'pending').length
  if (unchecked > 0) {
    throw new Error(`cannot run stage "${stage}" for "${key}": ${unchecked} research facts have not been checked yet`)
  }
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
      // one step per request from the browser; `only` names it. Without `only` every step runs (tests, scripts).
      if (only !== undefined) await researchStep({ client, key, draft, item: only })
      for (let next = pendingResearchItems(draft)[0]; only === undefined && next; next = pendingResearchItems(draft)[0]) {
        await researchStep({ client, key, draft, item: next.slug })
      }
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
  if (stage === 'research') return draft.research !== undefined
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
    delete draft.researchAreaNames
    delete draft.sources
    delete draft.researchFull
    delete draft.claims
    delete draft.geocodes
  }
}

// strips a stage's outputs and leaves it to run again. Clearing research also clears everything written from it.
export async function clearStage(key: string, stage: StageId): Promise<void> {
  const draft = await loadDraft(key)

  // downstream first, while draft.research still says which slots they own
  const targets: StageId[] = stage === 'research' ? ['verify', 'front', 'suburb', 'service', 'research'] : [stage]
  for (const target of targets) clearStageOutputs(draft, target)
  for (const target of targets) await clearProgress(key, target)

  await saveDraft(key, draft)
}

// re-run a stage (suburb and service are only cleared: the generate screen's loop rewrites them one request each)
export async function regenerateStage(client: ModelClient, key: string, stage: StageId): Promise<void> {
  await clearStage(key, stage)
  if (stage === 'suburb' || stage === 'service') return
  await runStage(client, key, stage)
}
