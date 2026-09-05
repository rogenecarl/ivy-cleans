// src/content/drafts.ts
/*
 * Draft sidecars for the admin pipeline. A DraftDoc lives at
 * content/_drafts/<key>.json while a city's research/copy stages are in
 * progress — it is NOT a CityContent (validateCityContent would reject it;
 * `sections` is a free-form partial map, not the full 10-slot set). Once
 * every stage is done, finalizeDraft() assembles a full CityContent from it,
 * validates it, and writes content/<key>.json + registers the key in
 * _cities.json. publishCity() then flips status to 'live', optionally wires
 * a domain host, and retires the sidecar.
 *
 * Framework-free by design: no next/cache import lives here. The admin
 * server action (Task 5) calls Next's revalidatePath itself after these
 * functions return — this module only clears the in-process store cache
 * via revalidateCity().
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import type { Facts } from '../pipeline/facts'
import type { ResearchOutput } from '../pipeline/schemas'
import { SERVICE_LOCAL_SLUGS, STAGES, isWrittenSlot, serviceSlots, stageSlots } from './slots'
import type { CityContent } from './types'
import { citySlug } from './interpolate'
import { checkCity, findInvisibleChars } from './similarity'
import { checkQuality } from './quality'
import { validateCityContent } from './validate'
import { getCity, listLiveCityKeys, revalidateCity } from './store'

export type DraftDoc = {
  facts: Facts
  /**
   * The raw web-search findings the research stage produced, kept verbatim.
   *
   * The structuring pass turns this into `research` and, before this field
   * existed, the findings were then discarded. That made a whole class of
   * failure undiagnosable: when a generated city came back with zero ZIP
   * codes and zero metro conditions there was no way to tell whether the
   * research never found them or the transcriber dropped them, and those two
   * faults have different fixes in different prompts.
   *
   * Never rendered. It exists to be read by a human debugging a bad city.
   */
  findings?: string
  research?: ResearchOutput
  sections: Record<string, string | string[]>
  done: string[]
  /** ISO timestamp, set once at creation by createDraft(). */
  createdAt: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content')
const DRAFTS_DIR = path.join(CONTENT_DIR, '_drafts')
const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')
const DOMAINS_JSON = path.join(CONTENT_DIR, '_domains.json')
const KEY_PATTERN = /^[a-z0-9-]+$/

type DomainsIndex = { default: string; hosts: Record<string, string> }

function draftPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.json`)
}

function cityPath(key: string): string {
  return path.join(CONTENT_DIR, `${key}.json`)
}

/*
 * Path built locally rather than importing from progress.ts — that module
 * doesn't import drafts.ts, but keeping the naming knowledge duplicated
 * here (instead of a mutual import) avoids setting up a cycle between the
 * two sidecar stores.
 */
function progressPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.progress.json`)
}

function assertKeyShape(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`invalid draft key "${key}": must match ${KEY_PATTERN}`)
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p)
    return true
  } catch {
    return false
  }
}

/** citySlug(city) — exported so admin actions can compute a key before creating the draft. */
export function draftKeyFor(city: string): string {
  return citySlug(city)
}

export async function createDraft(facts: Facts): Promise<string> {
  const key = draftKeyFor(facts.city)
  assertKeyShape(key)

  if (await fileExists(draftPath(key))) {
    throw new Error(`a draft already exists for "${key}"`)
  }
  if (await fileExists(cityPath(key))) {
    throw new Error(`a published city already exists for "${key}"`)
  }

  const doc: DraftDoc = {
    facts,
    sections: {},
    done: [],
    createdAt: new Date().toISOString(),
  }
  await mkdir(DRAFTS_DIR, { recursive: true })
  await writeFile(draftPath(key), JSON.stringify(doc, null, 2), 'utf-8')
  return key
}

export async function loadDraft(key: string): Promise<DraftDoc> {
  assertKeyShape(key)
  let raw: string
  try {
    raw = await readFile(draftPath(key), 'utf-8')
  } catch {
    throw new Error(`unknown draft "${key}"`)
  }
  return JSON.parse(raw) as DraftDoc
}

export async function saveDraft(key: string, doc: DraftDoc): Promise<void> {
  assertKeyShape(key)
  await mkdir(DRAFTS_DIR, { recursive: true })
  await writeFile(draftPath(key), JSON.stringify(doc, null, 2), 'utf-8')
}

export async function listDrafts(): Promise<
  { key: string; city: string; done: string[]; createdAt: string }[]
> {
  let files: string[]
  try {
    files = await readdir(DRAFTS_DIR)
  } catch {
    return []
  }
  const keys = files
    .filter((f) => f.endsWith('.json') && !f.endsWith('.progress.json'))
    .map((f) => f.slice(0, -'.json'.length))
  const entries = await Promise.all(
    keys.map(async (key) => {
      // A sidecar can disappear between the readdir and this read — publishing
      // a city deletes it, and the dashboard lists drafts on every load. That
      // race must not blow up the whole listing, so a vanished (or unreadable)
      // sidecar is simply omitted: it is no longer a draft.
      try {
        const doc = await loadDraft(key)
        return { key, city: doc.facts.city, done: doc.done, createdAt: doc.createdAt }
      } catch {
        return null
      }
    }),
  )
  return entries.filter((entry) => entry !== null)
}

export async function deleteDraft(key: string): Promise<void> {
  assertKeyShape(key)
  await rm(draftPath(key), { force: true })
  await rm(progressPath(key), { force: true })
}

/**
 * The section slots that do not depend on research at all — the eight the
 * front and deep stages own, plus one local section per template service.
 * finalizeDraft() requires every one of these before a draft can become a
 * published CityContent.
 *
 * The service slots sit here rather than with the suburb slots because the
 * same seven services exist in every city: how many area pages a city has is
 * a property of its research, but how many service pages it has is not.
 *
 * INVARIANT, pinned by a test: this is exactly `requiredSlotsFor(undefined)`.
 */
export const REQUIRED_SLOTS = [
  'services.heroParagraphs',
  'services.serviceIntro',
  'services.cards.dusting',
  'services.cards.vacuuming',
  'services.cards.bathroom',
  'services.cards.window',
  'services.cards.upholstery',
  'deep.whatIs',
  ...SERVICE_LOCAL_SLUGS.flatMap((slug) => serviceSlots(slug)),
] as const

/**
 * The full required-slot set for a given research state: REQUIRED_SLOTS plus
 * three slots per researched area. Suburb slots can't be known statically —
 * how many areas exist is a property of the research, not of the pipeline —
 * so this is the union of stageSlots(research) across every stage rather than
 * a const. With `research` undefined it reduces to exactly REQUIRED_SLOTS,
 * which is kept exported as that research-free base so existing call sites
 * that pre-date the suburb stage keep compiling untouched. Task 18 switches
 * finalizeDraft's missing-slot check and copy loop over to this function.
 */
export function requiredSlotsFor(research: ResearchOutput | undefined): readonly string[] {
  return STAGES.flatMap((stage) => stageSlots(research)[stage.id])
}

/** Idempotently appends `key` to content/_cities.json. */
async function appendCityKey(key: string): Promise<void> {
  let keys: string[] = []
  try {
    keys = JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
  } catch {
    keys = []
  }
  if (!keys.includes(key)) {
    keys.push(key)
    await writeFile(CITIES_JSON, JSON.stringify(keys, null, 2), 'utf-8')
  }
}

/**
 * The publication state of an EXISTING content/<key>.json, or null when this
 * is the city's first finalize.
 *
 * finalizeDraft rebuilds the whole document from the draft, which means it
 * would otherwise reset the two fields the draft does not know about —
 * `status` and `domain`, both owned by publishCity. Re-finalizing a live city
 * (the review screen does exactly this after a regenerate) would then demote
 * it to 'draft' and drop its domain while `_domains.json` still routed the
 * host to it: the site would 404 for real visitors on a real domain. Reading
 * the old document first and carrying those two fields forward is the guard.
 * A malformed or missing document yields null and the city starts as a draft,
 * which is the honest default — never assume 'live'.
 */
async function existingPublication(
  key: string,
): Promise<{ status: CityContent['status']; domain?: string } | null> {
  try {
    const doc = validateCityContent(JSON.parse(await readFile(cityPath(key), 'utf-8')))
    return doc.domain === undefined
      ? { status: doc.status }
      : { status: doc.status, domain: doc.domain }
  } catch {
    return null
  }
}

export async function finalizeDraft(key: string): Promise<void> {
  assertKeyShape(key)
  const draft = await loadDraft(key)
  const published = await existingPublication(key)

  const missing: string[] = []
  if (!draft.research) missing.push('research')
  for (const slot of requiredSlotsFor(draft.research)) {
    // isWrittenSlot, not `=== undefined`: a model can return `""` for a
    // string slot (SuburbCopySchema has no min-length constraint), and that
    // string IS `!== undefined`. Finalizing on a blank slot would publish an
    // empty <p> on a live page with the stage already marked done, so it
    // would never be retried.
    if (!isWrittenSlot(draft.sections[slot])) missing.push(`sections.${slot}`)
  }
  if (missing.length > 0) {
    throw new Error(`cannot finalize draft "${key}": missing ${missing.join(', ')}`)
  }

  const research = draft.research as ResearchOutput
  const { facts } = draft

  const sections: Record<string, string | string[]> = {}
  for (const slot of requiredSlotsFor(research)) {
    sections[slot] = draft.sections[slot]
  }

  const doc: CityContent = {
    city: facts.city,
    state: facts.state,
    stateName: facts.stateName,
    phone: facts.phone,
    phoneDisplay: facts.phoneDisplay,
    phoneHref: facts.phoneHref,
    // ADDRESS DEFAULT: validateCityContent requires `address` to be a
    // non-empty string, and a street address must never come from the
    // model. When the admin form left it blank, this placeholder is the
    // only value that satisfies validation honestly — the review screen
    // (Task 5) should nudge the operator to fill in a real address before
    // publish; nothing here blocks publishing without one.
    address: facts.address ?? `${facts.city} — address pending`,
    // Carried over from the previous document when there is one (see
    // existingPublication): a finalize refreshes COPY, it never publishes and
    // never un-publishes. A city's first finalize starts it as a draft.
    status: published?.status ?? 'draft',
    // Plan 5, Task 2: every finalized draft gets real suburb pages (pure
    // token substitution, zero AI cost — see src/data/suburb.ts) as soon as
    // its research.suburbs list exists, which REQUIRED_SLOTS/research above
    // already guarantee by this point.
    hasSuburbPages: true,
    maps: { front: null, home: null, contact: null },
    research: {
      suburbs: research.suburbs,
      /*
       * ZIPs are what this branch SERVES, which is an operator decision, not
       * a search result — so ops.zips wins when the operator has supplied it.
       *
       * research.zips is the fallback and must stay one: Minneapolis carries
       * 25 ZIPs recovered from prose during the migration, and its operator
       * has never filled the new field. Preferring ops unconditionally would
       * blank the ZIP list on the only live site.
       */
      zips: facts.ops?.zips?.length ? facts.ops.zips : research.zips,
      conditions: research.conditions,
      mapEmbedUrl: null,
    },
    sections,
  }
  if (facts.address !== undefined) {
    doc.contactAddress = facts.address
  }
  // Operator facts move onto the document because publishCity deletes the
  // sidecar they arrived in. See CityContent.ops.
  if (facts.ops !== undefined) {
    doc.ops = facts.ops
  }
  if (published?.domain !== undefined) {
    doc.domain = published.domain
  }

  const validated = validateCityContent(doc)

  await writeFile(cityPath(key), JSON.stringify(validated, null, 2), 'utf-8')
  await appendCityKey(key)
  revalidateCity(key)
}

export async function publishCity(key: string, domain?: string): Promise<void> {
  assertKeyShape(key)
  const raw = await readFile(cityPath(key), 'utf-8')
  const doc = validateCityContent(JSON.parse(raw))

  /*
   * Publish is the irreversible step, so it is where duplication is refused.
   * finalizeDraft deliberately does not check: an operator regenerating a
   * stage should be able to SEE findings in the review screen and decide,
   * rather than being blocked mid-iteration.
   *
   * Only live cities are compared against. A draft is not yet a page Google
   * can see, and blocking on one would make the order two operators happen
   * to work in decide whose copy is "the duplicate".
   */
  /*
   * Invisible characters are refused BEFORE the duplication check, because
   * they can defeat it: checkCity compares text, and a single zero-width
   * space inside an otherwise byte-identical paragraph makes two strings
   * compare unequal, so the duplication check goes quiet on a page that is
   * still identical to every reader and every crawler.
   */
  const invisible = findInvisibleChars(doc.sections)
  if (invisible.length > 0) {
    const lines = invisible.map((f) => `  ${f.slot}: ${f.detail}`)
    throw new Error(
      `cannot publish "${key}": ${invisible.length} invisible character(s)\n${lines.join('\n')}`,
    )
  }

  const liveKeys = (await listLiveCityKeys()).filter((k) => k !== key)
  const published = await Promise.all(
    liveKeys.map(async (k) => {
      const other = await getCity(k)
      return { city: other.city, sections: other.sections }
    }),
  )
  const findings = checkCity(doc.city, doc.sections, published)
  if (findings.length > 0) {
    const lines = findings.map((f) => `  ${f.slot} ↔ ${f.otherCity} ${f.otherSlot}: ${f.detail}`)
    throw new Error(
      `cannot publish "${key}": ${findings.length} duplication finding(s)\n${lines.join('\n')}`,
    )
  }

  /*
   * Quality last, because it is the cheapest to fix: a missing subdivision or
   * an unused operator fact is one stage regenerated, where a duplication
   * finding may mean the city should not exist at all.
   *
   * Only BLOCKING findings refuse. Banned phrasings are surfaced on the review
   * screen and let through — a stock phrase is worth an operator's judgement,
   * not an automatic refusal of a whole city.
   */
  const quality = checkQuality(doc).filter((f) => f.blocking)
  if (quality.length > 0) {
    const lines = quality.map((f) => `  ${f.slot}: ${f.detail}`)
    throw new Error(
      `cannot publish "${key}": ${quality.length} quality finding(s)\n${lines.join('\n')}`,
    )
  }

  doc.status = 'live'

  let host: string | undefined
  if (domain !== undefined) {
    host = domain.toLowerCase().split(':')[0]
    doc.domain = host
  }

  await writeFile(cityPath(key), JSON.stringify(doc, null, 2), 'utf-8')

  if (host !== undefined) {
    const domains = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as DomainsIndex
    /*
     * Re-publishing with a DIFFERENT domain has to retire the old one, or
     * _domains.json accumulates stale hosts that all still route here — the
     * previous domain would keep serving this city long after it was replaced,
     * and (since the index is statically inlined into the proxy bundle) there
     * is no runtime check that would ever notice. Only entries pointing at
     * THIS key are removed: another city's mapping is none of our business,
     * and clearing by host value alone would let a typo unmap a live tenant.
     */
    for (const [existingHost, mappedKey] of Object.entries(domains.hosts)) {
      if (mappedKey === key && existingHost !== host) delete domains.hosts[existingHost]
    }
    domains.hosts[host] = key
    await writeFile(DOMAINS_JSON, JSON.stringify(domains, null, 2), 'utf-8')
  }

  revalidateCity(key)
  await rm(draftPath(key), { force: true })
  await rm(progressPath(key), { force: true })
}
