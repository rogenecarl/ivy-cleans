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
import {
  SERVICE_LOCAL_SLUGS,
  isWritableArea,
  isWrittenSlot,
  serviceSlots,
  suburbSlots,
} from '../content/slots'
import { getCity, revalidateCity } from '../content/store'
import { validateCityContent } from '../content/validate'
import type { CityContent } from '../content/types'
import { serviceBySlug } from '../data/services/registry'
import { deriveFacts } from './facts'
import { makeClient } from './model'
import { readProgress, type ProgressEvent } from './progress'
import type { MarketOps, Suburb } from './schemas'
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

/**
 * The ops block as the form holds it: raw strings, one per input. All
 * optional — a brand-new market has none of it — but a prompt that receives
 * one of these facts is REQUIRED to use it, so an empty field is a page that
 * reads like a description of a town rather than a business working in it.
 *
 * Parsing lives in buildOps below, in the one place that already owns turning
 * form text into facts, so the create form and the ops editor cannot drift.
 */
export type OpsFields = {
  /** Comma, space or newline separated. "77002, 77003" or one per line. */
  zips?: string
  /** "2024-03". */
  servingSince?: string
  /** First name only. */
  crewLead?: string
  crewSize?: string
  homesCleaned?: string
  /** One per line: `quote | first name | area | date?`. See parseReviews. */
  reviews?: string
}

export type NewCityFields = OpsFields & {
  city: string
  state: string
  /** Any format — formatting characters are stripped here, not by the form. */
  phone: string
  address?: string
  notes?: string
}

/**
 * Splits an operator's ZIP paste into five-digit codes.
 *
 * Deliberately forgiving about separators — commas, spaces, newlines, a
 * pasted column from a spreadsheet — and deliberately strict about what
 * counts, because a malformed ZIP is a visible error on a live page. Anything
 * that is not exactly five digits is dropped rather than guessed at.
 */
export function parseZips(raw: string | undefined): string[] {
  if (!raw) return []
  const found = raw.split(/[^0-9]+/).filter((t) => /^\d{5}$/.test(t))
  return [...new Set(found)].sort()
}

/**
 * Bounds on the reviews field. This parser sits behind a server action, which
 * is an untrusted RPC boundary whether or not a page was ever rendered — the
 * same threat model sites/logic.ts states for MAX_RAW_LENGTH. MAX_REVIEWS is
 * generous against real use (the prompts quote at most two) and small enough
 * that nobody can grow a draft without bound through this field.
 */
export const MAX_REVIEWS = 10
export const MAX_REVIEWS_LENGTH = 8000

export type MarketReview = NonNullable<MarketOps['reviews']>[number]

export type ParseReviewsResult =
  | { ok: true; reviews: MarketReview[] }
  | { ok: false; error: string }

/** Removes one matching pair of surrounding quote marks, straight or typographic. */
function unquote(value: string): string {
  const pairs: [string, string][] = [
    ['"', '"'],
    ['\u201c', '\u201d'],
    ["'", "'"],
    ['\u2018', '\u2019'],
  ]
  for (const [open, close] of pairs) {
    if (value.length >= 2 && value.startsWith(open) && value.endsWith(close)) {
      return value.slice(open.length, value.length - close.length).trim()
    }
  }
  return value
}

/**
 * An operator's pasted reviews into the structured form the prompts quote from.
 *
 *   quote | first name | area | date (optional)
 *
 * one per line. The separator is a pipe rather than a comma or a dash because
 * real reviews are full of both — "Fast, thorough — and they came back" would
 * be shredded by either.
 *
 * WHY THIS REJECTS RATHER THAN DROPS, unlike parseZips above: a malformed ZIP
 * is unambiguous junk among dozens of good ones, and guessing at it would put
 * a visible error on a live page. A review is a paragraph a human typed once,
 * from a real customer in a real market — it is the one input a competitor
 * cannot reproduce. Losing one silently is unrecoverable, so a bad line fails
 * the whole submission with the line number the operator's cursor is on.
 * Blank lines are skipped but still counted, so that number matches the
 * textarea rather than the parser's idea of it.
 */
export function parseReviews(raw: string | undefined): ParseReviewsResult {
  if (!raw || raw.trim() === '') return { ok: true, reviews: [] }
  if (raw.length > MAX_REVIEWS_LENGTH) {
    return { ok: false, error: `reviews are too long (over ${MAX_REVIEWS_LENGTH} characters)` }
  }

  const reviews: MarketReview[] = []
  const lines = raw.split(/\r?\n/)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (line === '') continue

    const shape = `line ${i + 1}: expected "quote | first name | area" with an optional " | date"`
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length < 3 || parts.length > 4) {
      return { ok: false, error: shape }
    }

    const quote = unquote(parts[0])
    const [, firstName, area, date] = parts
    if (quote === '' || firstName === '' || area === '') {
      return { ok: false, error: shape }
    }

    reviews.push({ quote, firstName, area, ...(date ? { date } : {}) })
    if (reviews.length > MAX_REVIEWS) {
      return { ok: false, error: `at most ${MAX_REVIEWS} reviews can be saved at once` }
    }
  }

  return { ok: true, reviews }
}

/** Parses a positive integer field, or undefined when blank or unusable. */
function parseCount(raw: string | undefined): number | undefined {
  const digits = (raw ?? '').replace(/[^0-9]/g, '')
  if (digits === '') return undefined
  const n = Number(digits)
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined
}

export type BuildOpsResult =
  | { ok: true; ops: MarketOps | undefined }
  | { ok: false; error: string }

/**
 * Raw form strings -> the validated ops block, or undefined when the operator
 * filled in none of it.
 *
 * Undefined rather than {} on purpose: an empty object satisfies
 * `!== undefined` and would put a meaningless `ops: {}` on every draft, and —
 * once the ops editor exists — would make "cleared every field" indis-
 * tinguishable from "supplied an empty record".
 */
export function buildOps(fields: OpsFields): BuildOpsResult {
  const zips = parseZips(fields.zips)
  const servingSince = fields.servingSince?.trim()
  const crewLead = fields.crewLead?.trim()
  const crewSize = parseCount(fields.crewSize)
  const homesCleaned = parseCount(fields.homesCleaned)

  // Reviews are the one ops field that can FAIL rather than come back empty,
  // and the failure aborts the whole save — see parseReviews for why.
  const parsed = parseReviews(fields.reviews)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  const ops: MarketOps = {
    ...(zips.length ? { zips } : {}),
    ...(servingSince ? { servingSince } : {}),
    ...(crewLead ? { crewLead } : {}),
    ...(crewSize !== undefined ? { crewSize } : {}),
    ...(homesCleaned !== undefined ? { homesCleaned } : {}),
    ...(parsed.reviews.length ? { reviews: parsed.reviews } : {}),
  }
  return { ok: true, ops: Object.keys(ops).length ? ops : undefined }
}

/**
 * The inverse of buildOps: stored facts back into the exact text the form
 * shows. Round-trips — feeding this straight back to buildOps stores the same
 * facts — which is what lets the editor prefill without a separate shape.
 */
export function formatOpsFields(ops: MarketOps | undefined): OpsFields {
  if (!ops) return {}
  return {
    ...(ops.zips?.length ? { zips: ops.zips.join(', ') } : {}),
    ...(ops.servingSince ? { servingSince: ops.servingSince } : {}),
    ...(ops.crewLead ? { crewLead: ops.crewLead } : {}),
    ...(ops.crewSize !== undefined ? { crewSize: String(ops.crewSize) } : {}),
    ...(ops.homesCleaned !== undefined ? { homesCleaned: String(ops.homesCleaned) } : {}),
    ...(ops.reviews?.length
      ? {
          reviews: ops.reviews
            .map((r) => [r.quote, r.firstName, r.area, ...(r.date ? [r.date] : [])].join(' | '))
            .join('\n'),
        }
      : {}),
  }
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

    const built = buildOps(fields)
    if (!built.ok) return { ok: false, error: built.error }

    const facts = deriveFacts({
      city: fields.city,
      state: fields.state.trim(),
      phoneDigits: digits,
      ...(address ? { address } : {}),
      ...(notes ? { notes } : {}),
      ...(built.ops ? { ops: built.ops } : {}),
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
export async function runStageLogic(
  key: string,
  stage: StageId,
  only?: string
): Promise<ActionResult> {
  return attempt(() => runStage(makeClient(), key, stage, only))
}

/**
 * The areas the suburb stage still has to write, in order.
 *
 * The admin drives the suburb loop one area per request: twelve model calls
 * inside a single request runs three to six minutes and a serverless function
 * is killed long before that. The client needs the list to drive that loop,
 * and it cannot know it before research has run.
 *
 * Already-written and un-writable areas are omitted, so the returned length is
 * exactly the number of model calls left to pay for.
 */
export async function pendingSuburbsLogic(
  key: string
): Promise<{ ok: true; areas: { slug: string; name: string }[] } | { ok: false; error: string }> {
  try {
    const draft = await loadDraft(key)
    const research = draft.research
    if (!research) return { ok: true, areas: [] }
    const areas = research.suburbs
      .filter(isWritableArea)
      .filter((s) => !suburbSlots(s.slug).every((slot) => isWrittenSlot(draft.sections[slot])))
      .map((s) => ({ slug: s.slug, name: s.name }))
    return { ok: true, areas }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * The service pages the service stage still has to write, in order.
 *
 * The admin drives this loop one service per request, for the same reason the
 * suburb loop is driven that way: six model calls inside a single server
 * action runs for minutes and a serverless function is killed long before
 * that.
 *
 * UNLIKE pendingSuburbsLogic this does not need research to have run — the
 * same seven services exist in every city, so the list is known from the
 * moment a draft exists. (The stage itself still needs research, for the
 * local conditions it writes from.) Already-written services are omitted, so
 * the returned length is exactly the number of model calls left to pay for.
 */
export async function pendingServicesLogic(
  key: string
): Promise<{ ok: true; services: { slug: string; name: string }[] } | { ok: false; error: string }> {
  try {
    const draft = await loadDraft(key)
    const services = SERVICE_LOCAL_SLUGS.filter(
      (slug) => !serviceSlots(slug).every((slot) => isWrittenSlot(draft.sections[slot]))
    ).map((slug) => ({ slug, name: serviceBySlug(slug)?.name ?? slug }))
    return { ok: true, services }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
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
 * Ops editing
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The stored ops for a city, as the text the editor's form should show.
 *
 * The draft sidecar wins when both exist: between finalize and publish it is
 * the newer of the two, and it is what a regenerate would rebuild from.
 */
export async function readOpsLogic(
  key: string,
): Promise<{ ok: true; fields: OpsFields } | { ok: false; error: string }> {
  try {
    let draft
    try {
      draft = await loadDraft(key)
    } catch {
      draft = null
    }
    if (draft) return { ok: true, fields: formatOpsFields(draft.facts.ops) }

    const doc = await readCityDoc(key)
    if (doc) return { ok: true, fields: formatOpsFields(doc.ops) }

    return { ok: false, error: `no draft or published document found for "${key}"` }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/**
 * Writes edited market facts to wherever this city lives.
 *
 * The same two-places-at-once problem updateSuburbsLogic documents, for the
 * same reason: between finalize and publish a city has BOTH a sidecar and a
 * content/<key>.json, and an edit that touched only one would be silently
 * reverted by the other. Both are updated when both exist, and it is not an
 * error for only one to.
 *
 * A LIVE city has only the document — publishCity deletes the sidecar — and
 * that is precisely the case this function exists for. Before it, ops could
 * be entered only on the create form, so hiring a crew lead after launch had
 * nowhere to be recorded.
 *
 * Nothing here regenerates copy. Changing a fact changes what the NEXT
 * generation is given; the pages already written still say what they said.
 */
export async function updateOpsLogic(key: string, fields: OpsFields): Promise<ActionResult> {
  try {
    // Parse before touching anything, so a malformed review line leaves the
    // stored facts exactly as they were rather than half-replacing them.
    const built = buildOps(fields)
    if (!built.ok) return { ok: false, error: built.error }

    let draft
    try {
      draft = await loadDraft(key)
    } catch {
      draft = null
    }
    const doc = await readCityDoc(key)

    if (!draft && !doc) {
      return { ok: false, error: `no draft or published document found for "${key}"` }
    }

    if (draft) {
      // Delete rather than assign undefined: the sidecar is serialized to
      // JSON, where `ops: undefined` and an absent key are the same thing on
      // the way out but not on the way in through a partial merge.
      const facts = { ...draft.facts }
      if (built.ops) facts.ops = built.ops
      else delete facts.ops
      draft.facts = facts
      await saveDraft(key, draft)
    }

    if (doc) {
      if (built.ops) doc.ops = built.ops
      else delete doc.ops
      await writeFile(
        path.join(CONTENT_DIR, `${key}.json`),
        JSON.stringify(validateCityContent(doc), null, 2),
        'utf-8',
      )
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
