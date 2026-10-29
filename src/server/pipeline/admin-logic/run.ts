import { loadDraft, saveDraft } from '@/server/content/drafts'
import { researchFromClaims, type ResearchClaim } from '@/server/pipeline/claims'
import { SERVICE_LOCAL_SLUGS, isWritableArea, isWrittenSlot, serviceSlots, suburbSlots } from '@/server/content/slots'
import { serviceBySlug } from '@/site/data/services/registry'
import { makeClient } from '@/server/pipeline/model'
import { readProgress, type ProgressEvent } from '@/server/pipeline/progress'
import { CITY_ITEM, pendingVerifyItems, regenerateStage, runStage, type StageId } from '@/server/pipeline/stages'
import { type ActionResult, attempt, errorMessage } from './shared'

// ── Stage execution ──

// one stage per request so a serverless cap, reload or retry is survivable
export async function runStageLogic(
  key: string,
  stage: StageId,
  only?: string
): Promise<ActionResult> {
  return attempt(() => runStage(makeClient(), key, stage, only))
}

export type ItemStage = 'verify' | 'suburb' | 'service'

export function isItemStage(stage: string): stage is ItemStage {
  return stage === 'verify' || stage === 'suburb' || stage === 'service'
}
export type PendingItems = { ok: true; items: { slug: string; name: string }[] } | { ok: false; error: string }

// areas or service pages a per-item stage still owes; the client drives one request each. Services are known from
// creation (the seven are fixed); areas come from research, so there are none before it.
export async function pendingItemsLogic(key: string, stage: ItemStage): Promise<PendingItems> {
  try {
    const draft = await loadDraft(key)
    const owed = (slots: readonly string[]) => !slots.every((slot) => isWrittenSlot(draft.sections[slot]))
    if (stage === 'verify') {
      const names = new Map((draft.researchFull?.suburbs ?? []).map((s) => [s.slug, s.name]))
      const items = pendingVerifyItems(draft).map((slug) => ({
        slug,
        name: slug === CITY_ITEM ? 'City-wide facts' : (names.get(slug) ?? slug),
      }))
      return { ok: true, items }
    }
    if (stage === 'service') {
      const items = SERVICE_LOCAL_SLUGS.filter((slug) => owed(serviceSlots(slug))).map((slug) => ({
        slug,
        name: serviceBySlug(slug)?.name ?? slug,
      }))
      return { ok: true, items }
    }
    const items = (draft.research?.suburbs ?? [])
      .filter(isWritableArea)
      .filter((s) => owed(suburbSlots(s.slug)))
      .map((s) => ({ slug: s.slug, name: s.name }))
    return { ok: true, items }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Force a stage to run again. Research also clears front/home/deep — see stages/run.ts. */
export async function regenerateLogic(key: string, stage: StageId): Promise<ActionResult> {
  // checking every area in one request breaks the one-call-per-request rule; regenerate research to check again
  if (stage === 'verify') return { ok: false, error: 'the fact check runs again when research is regenerated' }
  return attempt(() => regenerateStage(makeClient(), key, stage))
}

// snapshot for the activity feed: events, done stages, suburb names/zips, subdivision total
export type ProgressSnapshot =
  | {
      ok: true
      events: ProgressEvent[]
      done: string[]
      research: { suburbs: string[]; zips: string[]; subdivisions: number } | null
    }
  | { ok: false; error: string }

export async function getProgressLogic(key: string): Promise<ProgressSnapshot> {
  try {
    const [draft, events] = await Promise.all([loadDraft(key), readProgress(key)])
    const research = draft.research
      ? {
          suburbs: draft.research.suburbs.map((s) => s.name),
          zips: draft.research.zips,
          subdivisions: draft.research.suburbs.reduce((n, s) => n + s.subdivisions.length, 0),
        }
      : null
    return { ok: true, events, done: draft.done, research }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Draft sidecar -> validated content/<key>.json + _cities.json registration. */

// ── Decisions on unconfirmed facts (before writing) ──

export type UndecidedClaim = ResearchClaim & { areaName: string | null; sourceLinks: { title: string; url: string }[] }

export async function listDecisionsLogic(
  key: string,
): Promise<{ ok: true; claims: UndecidedClaim[] } | { ok: false; error: string }> {
  try {
    const draft = await loadDraft(key)
    const names = new Map((draft.researchFull?.suburbs ?? []).map((s) => [s.slug, s.name]))
    const sources = new Map((draft.sources ?? []).map((s) => [s.id, s]))
    const claims = (draft.claims ?? [])
      .filter((c) => c.status === 'unconfirmed')
      .map((c) => ({
        ...c,
        areaName: c.area === null ? null : (names.get(c.area) ?? c.area),
        sourceLinks: c.sources.flatMap((id) => {
          const s = sources.get(id)
          return s ? [{ title: s.title, url: s.url }] : []
        }),
      }))
    return { ok: true, claims }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

// keep → the fact goes back into what the writers see; drop → it stays out. Only an undecided fact can be decided.
export async function decideClaimLogic(key: string, claimId: string, decision: 'keep' | 'drop'): Promise<ActionResult> {
  try {
    const draft = await loadDraft(key)
    const claim = draft.claims?.find((c) => c.id === claimId)
    if (!claim) return { ok: false, error: 'that fact is no longer in this draft — reload the page' }
    if (claim.status !== 'unconfirmed') return { ok: false, error: 'that fact has already been decided' }
    claim.status = decision === 'keep' ? 'kept' : 'dropped'
    if (draft.researchFull) draft.research = researchFromClaims(draft.researchFull, draft.claims!)
    await saveDraft(key, draft)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}
