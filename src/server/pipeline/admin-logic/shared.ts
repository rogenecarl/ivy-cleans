import { findDraft, saveDraft } from '@/server/content/drafts'
import { readCityDoc, revalidateCity, writeCityDoc } from '@/server/content/store'
import type { MarketOps } from '@/server/pipeline/schemas'
import { STAGE_IDS, type StageId } from '@/server/pipeline/stages'

export type ActionResult = { ok: true } | { ok: false; error: string }
export type CreateResult = { ok: true; key: string } | { ok: false; error: string }

// editor row: name and slug only, never the researched fields
export type SuburbRow = { name: string; slug: string }

/** Dashboard row states. See listCities() for how each is decided. */
export type CityStatus = 'live' | 'draft' | 'generating' | 'draft-unfinalized' | 'error'

export type CityRow = {
  key: string
  city: string
  status: CityStatus
  /** True when a draft sidecar is still on disk (i.e. not yet published). */
  hasDraft: boolean
  /** How many of the four stages have completed, when a sidecar exists. */
  doneCount?: number
  /** Populated when status is 'error'. */
  error?: string
}

/** Narrows an unknown thrown value to a message an operator can read. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/** Wraps a void-returning operation in the serializable result shape. */
export async function attempt(run: () => Promise<void>): Promise<ActionResult> {
  try {
    await run()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export function isStageId(value: string): value is StageId {
  return (STAGE_IDS as readonly string[]).includes(value)
}


type CityEdit = { ops: MarketOps | undefined; sections: Record<string, string | string[]> }

// one edit applied wherever the city lives (sidecar, document, or both); the writer decides, this only plumbs
export async function editCity(
  key: string,
  change: (current: CityEdit) => CityEdit | { error: string },
): Promise<ActionResult> {
  const draft = await findDraft(key)
  const doc = await readCityDoc(key)
  if (!draft && !doc) return { ok: false, error: `no draft or published document found for "${key}"` }

  if (draft) {
    const next = change({ ops: draft.facts.ops, sections: draft.sections })
    if ('error' in next) return { ok: false, error: next.error }
    const facts = { ...draft.facts }
    if (next.ops) facts.ops = next.ops
    else delete facts.ops
    draft.facts = facts
    draft.sections = next.sections
    await saveDraft(key, draft)
  }
  if (doc) {
    const next = change({ ops: doc.ops, sections: doc.sections })
    if ('error' in next) return { ok: false, error: next.error }
    if (next.ops) doc.ops = next.ops
    else delete doc.ops
    doc.sections = next.sections
    await writeCityDoc(key, doc)
  }
  revalidateCity(key)
  return { ok: true }
}
