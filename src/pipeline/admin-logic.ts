/**
 * Everything the admin server actions actually DO, as plain async functions.
 *
 * WHY THIS FILE EXISTS, separate from actions.ts: a module carrying the
 * 'use server' directive is compiled by Next into a set of RPC endpoints, and
 * importing it from vitest pulls in the Next server runtime rather than the
 * functions themselves. Keeping the substance here means the pipeline's
 * behaviour is unit-testable in plain node (tests/admin-logic.test.ts), while
 * actions.ts stays a thin wrapper adding only the framework-specific bits
 * (redirect, revalidatePath).
 *
 * HARD RULE: nothing in this file may import from 'next/*'. The test suite
 * proves that indirectly — it imports this module in a bare node environment,
 * which would throw if a Next server-only module came along for the ride.
 *
 * Every function returns a serializable result instead of throwing, because
 * these values cross the server-action boundary to the browser: an Error
 * thrown in a server action reaches the client as a generic digest, which is
 * useless to an operator staring at a failed research stage. The one
 * exception is createDraftFromFields, which returns the new key on success so
 * the action can redirect.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  createDraft,
  deleteDraft,
  finalizeDraft,
  listDrafts,
  loadDraft,
  publishCity,
  saveDraft,
} from '../content/drafts'
import { getCity, revalidateCity } from '../content/store'
import { validateCityContent } from '../content/validate'
import type { CityContent } from '../content/types'
import { deriveFacts } from './facts'
import { makeClient } from './model'
import { readProgress, type ProgressEvent } from './progress'
import type { Suburb } from './schemas'
import { STAGE_IDS, normalizeSlug, regenerateStage, reservedSlugs, runStage, type StageId } from './stages'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')

export type ActionResult = { ok: true } | { ok: false; error: string }
export type CreateResult = { ok: true; key: string } | { ok: false; error: string }

/**
 * Shape of a row the suburbs editor sends back — name and slug only. This is
 * NOT the researched `Suburb` (src/pipeline/schemas.ts): the editor never
 * sees subdivisions/housingCharacter/conditions, so this type must not grow
 * them. mergeSuburbRows below is what reconciles a row with the rich entity
 * it corresponds to.
 */
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
async function attempt(run: () => Promise<void>): Promise<ActionResult> {
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

/* ────────────────────────────────────────────────────────────────────────────
 * Create
 * ──────────────────────────────────────────────────────────────────────────── */

export type NewCityFields = {
  city: string
  state: string
  /** Any format — formatting characters are stripped here, not by the form. */
  phone: string
  address?: string
  notes?: string
}

/**
 * Form input -> derived facts -> draft sidecar. The phone arrives however the
 * operator typed it ("(305) 555-0142", "305.555.0142"); everything that is not
 * a digit is dropped before deriveFacts, which is the single validator for the
 * 10-digit rule. Optional fields that came back empty are omitted rather than
 * stored as '' — Facts treats absent and empty differently (an empty address
 * would satisfy `!== undefined` and land in the published document).
 */
export async function createDraftFromFields(fields: NewCityFields): Promise<CreateResult> {
  try {
    const digits = fields.phone.replace(/\D/g, '')
    const address = fields.address?.trim()
    const notes = fields.notes?.trim()

    const facts = deriveFacts({
      city: fields.city,
      state: fields.state.trim(),
      phoneDigits: digits,
      ...(address ? { address } : {}),
      ...(notes ? { notes } : {}),
    })
    const key = await createDraft(facts)
    return { ok: true, key }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage execution
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One stage, one call. The progress screen drives these sequentially rather
 * than running the pipeline in a single request: each stage is its own short
 * request, which survives a serverless duration cap, a reload, and a retry.
 */
export async function runStageLogic(key: string, stage: StageId): Promise<ActionResult> {
  return attempt(() => runStage(makeClient(), key, stage))
}

/** Force a stage to run again. Research also clears front/home/deep — see stages.ts. */
export async function regenerateLogic(key: string, stage: StageId): Promise<ActionResult> {
  return attempt(() => regenerateStage(makeClient(), key, stage))
}

/** Snapshot the admin's live activity feed can poll: the raw event log, which stages
 * are done, and (once research has run) the researched suburb names / zips as plain
 * strings — not the {name, slug} objects draft.research stores them as — plus a
 * subdivisions total (landmarks are gone; subdivisions are the fact that replaced
 * them, see src/pipeline/schemas.ts ResearchSchema). */
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
    const draft = await loadDraft(key)
    const events = await readProgress(key)
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
export async function finalizeLogic(key: string): Promise<ActionResult> {
  return attempt(() => finalizeDraft(key))
}

/** Flip status to 'live', optionally map a host, retire the sidecar. */
export async function publishLogic(key: string, domain?: string): Promise<ActionResult> {
  const host = domain?.trim()
  return attempt(() => publishCity(key, host ? host : undefined))
}

/** Removes an in-progress draft sidecar (dashboard housekeeping). */
export async function discardDraftLogic(key: string): Promise<ActionResult> {
  return attempt(() => deleteDraft(key))
}

/* ────────────────────────────────────────────────────────────────────────────
 * Suburb editing
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Slugs become URLs, so the editor's free text goes through the same
 * normalizer the model output does (stages.ts normalizeSlug): lowercase,
 * non-alphanumerics to single hyphens, edges trimmed. Rows with an empty name,
 * an empty normalized slug, or a slug that duplicates an earlier row are
 * dropped — two area entries cannot share a URL.
 */
export function normalizeSuburbs(rows: SuburbRow[]): SuburbRow[] {
  const seen = new Set<string>()
  const out: SuburbRow[] = []
  for (const row of rows) {
    const name = row.name.trim()
    // An empty slug field is a convenience, not an error: fall back to the
    // name so the operator can add a row by typing only what it is called.
    const slug = normalizeSlug(row.slug.trim() === '' ? name : row.slug)
    if (name === '' || slug === '' || seen.has(slug)) continue
    seen.add(slug)
    out.push({ name, slug })
  }
  return out
}

/**
 * Rows from the editor carry name and slug only; the researched fields live
 * on the existing entries and must survive an edit. Slug is the stable
 * identity, so match on it and copy the research across.
 *
 * A row whose slug matches nothing is one the operator ADDED by hand. It gets
 * empty research fields, which is honest — nobody researched it — and the
 * uniqueness gate scores it 0 and flags it in the review screen rather than
 * letting an unresearched area quietly become a page.
 *
 * CONSEQUENCE, documented deliberately: renaming an area without changing its
 * slug keeps the old research. Operators rename for spelling far more often
 * than they repoint a row at a different place, so slug-as-identity is the
 * right default — but the editor hint should say so.
 */
function mergeSuburbRows(rows: readonly SuburbRow[], existing: readonly Suburb[]): Suburb[] {
  const bySlug = new Map(existing.map((s) => [s.slug, s]))
  return rows.map((row) => {
    const prior = bySlug.get(row.slug)
    return {
      name: row.name,
      slug: row.slug,
      subdivisions: prior?.subdivisions ?? [],
      housingCharacter: prior?.housingCharacter ?? '',
      conditions: prior?.conditions ?? [],
    }
  })
}

async function readCityDoc(key: string): Promise<CityContent | null> {
  try {
    const raw = await readFile(path.join(CONTENT_DIR, `${key}.json`), 'utf-8')
    return validateCityContent(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * Writes an edited suburb list to wherever it lives for this city.
 *
 * A city can be in two places at once: between finalize and publish it has
 * BOTH a draft sidecar and a content/<key>.json. The published document is
 * what the preview renders (src/data/areas.ts maps `research.suburbs`), and
 * the sidecar is what a later regenerate/finalize would rebuild from — so an
 * edit that touched only one of them would silently revert. Both are updated
 * when both exist, and it is not an error for only one to.
 */
export async function updateSuburbsLogic(key: string, rows: SuburbRow[]): Promise<ActionResult> {
  try {
    const suburbs = normalizeSuburbs(rows)
    if (suburbs.length === 0) {
      return { ok: false, error: 'at least one suburb with a name is required' }
    }

    let draft
    try {
      draft = await loadDraft(key)
    } catch {
      draft = null
    }
    const doc = await readCityDoc(key)

    // The operator's slug must not collide with a static sibling route or
    // this city's two computed service slugs (stages.ts reservedSlugs) — a
    // colliding row would silently SHADOW that page rather than get its own,
    // so unlike normalizeResearchSlugs' silent drop, the human here gets told
    // exactly which slug is the problem instead of watching it vanish.
    const cityName = draft?.facts.city ?? doc?.city ?? key
    const collision = suburbs.find((s) => reservedSlugs(cityName).has(s.slug))
    if (collision) {
      return {
        ok: false,
        error: `"${collision.slug}" is reserved by an existing page — choose a different slug for "${collision.name}".`,
      }
    }

    let touched = false

    if (draft?.research) {
      draft.research = { ...draft.research, suburbs: mergeSuburbRows(suburbs, draft.research.suburbs) }
      await saveDraft(key, draft)
      touched = true
    }

    if (doc) {
      doc.research = { ...doc.research, suburbs: mergeSuburbRows(suburbs, doc.research.suburbs) }
      await writeFile(
        path.join(CONTENT_DIR, `${key}.json`),
        JSON.stringify(validateCityContent(doc), null, 2),
        'utf-8',
      )
      touched = true
    }

    if (!touched) {
      return { ok: false, error: `no draft research or published document found for "${key}"` }
    }

    revalidateCity(key)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dashboard listing
 * ──────────────────────────────────────────────────────────────────────────── */

async function readCityKeys(): Promise<string[]> {
  try {
    return JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
  } catch {
    return []
  }
}

/**
 * Every city the operator can act on, in one list.
 *
 * The two sources overlap by design. `content/_cities.json` holds every city
 * that has been FINALIZED (published or not) and its document carries the
 * authoritative live/draft status. `listDrafts()` holds every sidecar, which
 * exists from creation until publish. A city that has been finalized but not
 * published therefore appears in both — the document wins for status, and the
 * row is flagged `hasDraft` so the screen can still offer Regenerate.
 *
 * A sidecar with no document is mid-pipeline: 'generating' while stages
 * remain, 'draft-unfinalized' once all four are done but finalize has not run
 * (or failed) — those are the two states the Resume link exists for.
 *
 * Sidecars are read FIRST and the documents layered on top, which decides the
 * one ambiguous case: a key registered in _cities.json whose document will not
 * load. With a sidecar present that is simply a city mid-pipeline (a key can
 * be registered by a finalize that a later regenerate rolled back), so the
 * sidecar's own state stands; with no sidecar there is nothing to fall back on
 * and the row is surfaced as 'error' rather than dropped — a city silently
 * missing from this table is the one outcome an operator cannot debug.
 */
export async function listCities(): Promise<CityRow[]> {
  const rows = new Map<string, CityRow>()

  for (const draft of await listDrafts()) {
    rows.set(draft.key, {
      key: draft.key,
      city: draft.city,
      status: draft.done.length < STAGE_IDS.length ? 'generating' : 'draft-unfinalized',
      hasDraft: true,
      doneCount: draft.done.length,
    })
  }

  for (const key of await readCityKeys()) {
    const draftRow = rows.get(key)
    try {
      const doc = await getCity(key)
      rows.set(key, {
        key,
        city: doc.city,
        status: doc.status,
        hasDraft: draftRow !== undefined,
        ...(draftRow?.doneCount !== undefined ? { doneCount: draftRow.doneCount } : {}),
      })
    } catch (err) {
      if (draftRow) continue
      rows.set(key, { key, city: key, status: 'error', hasDraft: false, error: errorMessage(err) })
    }
  }

  return [...rows.values()].sort((a, b) => a.city.localeCompare(b.city))
}
