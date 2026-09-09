// The admin server actions' substance, framework-free so tests run in plain node. Nothing here imports next/*.
// Functions return results instead of throwing: a thrown Error reaches the browser as a useless digest.
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
import type { CityContent, Suburb as StoredSuburb } from '../content/types'
import { serviceBySlug } from '../data/services/registry'
import { buildProvisioners, checkDomainLive } from './provision'
import { deriveFacts } from './facts'
import { makeClient } from './model'
import { readProgress, type ProgressEvent } from './progress'
import type { MarketOps, Suburb } from './schemas'
import { STAGE_IDS, normalizeSlug, regenerateStage, reservedSlugs, runStage, type StageId } from './stages'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')

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

// ── Create ──

// The ops block as the form holds it. Parsing is in buildOps so the create form and ops editor can't drift.
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

// /admin/new collects everything except reviews, which live on the settings screen
export type NewCityFields = Omit<OpsFields, 'reviews'> & {
  city: string
  state: string
  /** Any format — formatting characters are stripped here, not by the form. */
  phone: string
  address?: string
}

// ZIP paste -> five-digit codes; forgiving separators, anything else dropped
export function parseZips(raw: string | undefined): string[] {
  if (!raw) return []
  const found = raw.split(/[^0-9]+/).filter((t) => /^\d{5}$/.test(t))
  return [...new Set(found)].sort()
}

// bounds on the reviews field (untrusted RPC boundary)
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

// Reviews: `quote | first name | area | date?`, one per line. Pipe because real reviews are full of commas and dashes.
// A bad line rejects the whole submission with its line number: a review is the one input that can't be reproduced.
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

// raw form strings -> ops block, or undefined when empty (never {})
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

// inverse of buildOps; round-trips
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

// form -> derived facts -> draft sidecar. Phone stripped to digits; empty optionals omitted.
export async function createDraftFromFields(fields: NewCityFields): Promise<CreateResult> {
  try {
    const digits = fields.phone.replace(/\D/g, '')
    const address = fields.address?.trim()

    const built = buildOps(fields)
    if (!built.ok) return { ok: false, error: built.error }

    const facts = deriveFacts({
      city: fields.city,
      state: fields.state.trim(),
      phoneDigits: digits,
      ...(address ? { address } : {}),
      ...(built.ops ? { ops: built.ops } : {}),
    })
    const key = await createDraft(facts)
    return { ok: true, key }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

// ── Stage execution ──

// one stage per request so a serverless cap, reload or retry is survivable
export async function runStageLogic(
  key: string,
  stage: StageId,
  only?: string
): Promise<ActionResult> {
  return attempt(() => runStage(makeClient(), key, stage, only))
}

// areas the suburb stage still has to write; the client drives one per request
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

// service pages still to write; known from creation since the seven services are fixed
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

// flip to live, map or buy a host, retire the sidecar. `provision` spends money, so it is explicit.
export async function publishLogic(
  key: string,
  domain?: string,
  provision?: boolean,
): Promise<ActionResult> {
  const host = domain?.trim()
  return attempt(() =>
    publishCity(key, {
      ...(host ? { domain: host } : {}),
      ...(provision ? { provisionDomain: true } : {}),
    }),
  )
}

// is a provisioned domain serving yet? The browser polls this; clears doc.provisioning once yes.
export async function checkProvisioningLogic(
  key: string,
): Promise<{ ok: true; live: boolean; domain: string | null } | { ok: false; error: string }> {
  try {
    const doc = await readCityDoc(key)
    if (!doc) return { ok: false, error: `no published document found for "${key}"` }
    if (!doc.provisioning) return { ok: true, live: true, domain: doc.domain ?? null }

    const { host } = buildProvisioners()
    const live = await checkDomainLive(host, doc.provisioning.domain)
    if (live) {
      delete doc.provisioning
      await writeFile(
        path.join(CONTENT_DIR, `${key}.json`),
        JSON.stringify(validateCityContent(doc), null, 2),
        'utf-8',
      )
      revalidateCity(key)
    }
    return { ok: true, live, domain: doc.provisioning?.domain ?? doc.domain ?? null }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Removes an in-progress draft sidecar (dashboard housekeeping). */
export async function discardDraftLogic(key: string): Promise<ActionResult> {
  return attempt(() => deleteDraft(key))
}

// ── Suburb editing ──

// editor text through the same slug normaliser as model output; empty and duplicate rows dropped
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

// rows carry name + slug; research fields are matched back by slug. An unknown slug is a hand-added row with empty research.
function mergeSuburbRows(rows: readonly SuburbRow[], existing: readonly StoredSuburb[]): Suburb[] {
  const bySlug = new Map(existing.map((s) => [s.slug, s]))
  return rows.map((row) => {
    const prior = bySlug.get(row.slug)
    return {
      name: row.name,
      slug: row.slug,
      subdivisions: prior?.subdivisions ?? [],
      housingCharacter: prior?.housingCharacter ?? '',
      conditions: prior?.conditions ?? [],
      neighbors: prior?.neighbors ?? [],
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

// a city between finalize and publish has both a sidecar and a document; update both
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

    // a colliding slug would shadow a page; tell the operator which
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

// ── Ops editing ──

// stored ops as form text; the sidecar wins when both exist
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

// write edited facts wherever the city lives (sidecar, document, or both). Changes what the NEXT generation is given.
export async function updateOpsLogic(key: string, fields: OpsFields): Promise<ActionResult> {
  try {
    // Parse before touching anything, so a malformed review line leaves the
    // stored facts exactly as they were rather than half-replacing them.
    const built = buildOps(fields)
    if (!built.ok) return { ok: false, error: built.error }

    // photos survive a save: the form has no photo input and buildOps replaces the whole block
    const keepPhotos = (previous: MarketOps | undefined): MarketOps | undefined => {
      const photos = previous?.photos
      if (!photos?.length) return built.ops
      return { ...(built.ops ?? {}), photos }
    }

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
      // delete, not undefined: the sidecar is JSON
      const facts = { ...draft.facts }
      const ops = keepPhotos(facts.ops)
      if (ops) facts.ops = ops
      else delete facts.ops
      draft.facts = facts
      await saveDraft(key, draft)
    }

    if (doc) {
      const ops = keepPhotos(doc.ops)
      if (ops) doc.ops = ops
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

// ── Dashboard listing ──

async function readCityKeys(): Promise<string[]> {
  try {
    return JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
  } catch {
    return []
  }
}

// Every city in one list. _cities.json holds finalized cities, listDrafts() holds sidecars; a finalized-not-published
// city is in both (the document wins for status). Sidecars first, documents on top; an unloadable document with no sidecar is 'error'.
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
