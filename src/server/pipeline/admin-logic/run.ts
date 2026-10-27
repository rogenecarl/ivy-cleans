import { loadDraft } from '@/server/content/drafts'
import { SERVICE_LOCAL_SLUGS, isWritableArea, isWrittenSlot, serviceSlots, suburbSlots } from '@/server/content/slots'
import { serviceBySlug } from '@/site/data/services/registry'
import { makeClient } from '@/server/pipeline/model'
import { readProgress, type ProgressEvent } from '@/server/pipeline/progress'
import { regenerateStage, runStage, type StageId } from '@/server/pipeline/stages'
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

export type ItemStage = 'suburb' | 'service'
export type PendingItems = { ok: true; items: { slug: string; name: string }[] } | { ok: false; error: string }

// areas or service pages a per-item stage still owes; the client drives one request each. Services are known from
// creation (the seven are fixed); areas come from research, so there are none before it.
export async function pendingItemsLogic(key: string, stage: ItemStage): Promise<PendingItems> {
  try {
    const draft = await loadDraft(key)
    const owed = (slots: readonly string[]) => !slots.every((slot) => isWrittenSlot(draft.sections[slot]))
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
