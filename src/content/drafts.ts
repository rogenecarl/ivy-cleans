// src/content/drafts.ts
// Draft sidecars at content/_drafts/<key>.json while stages run. finalizeDraft() assembles and validates a CityContent;
// publishCity() flips it live and retires the sidecar. Framework-free: the server action calls revalidatePath itself.
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import type { Facts } from '../pipeline/facts'
import type { ResearchOutput } from '../pipeline/schemas'
import {
  SERVICE_LOCAL_SLUGS,
  STAGES,
  STAGE_IDS,
  isWrittenSlot,
  serviceSlots,
  stageSlots,
} from './slots'
import type { CityContent, SlotLink } from './types'
import { citySlug } from './interpolate'
import { checkCity, findInvisibleChars } from './similarity'
import { checkQuality } from './quality'
import { buildProvisioners, buildRouter, provisionDomain } from '../pipeline/provision'
import { validateCityContent } from './validate'
import { getCity, listLiveCityKeys, revalidateCity } from './store'

export type DraftDoc = {
  facts: Facts
  // raw web-search findings, kept verbatim for debugging a bad city; never rendered
  findings?: string
  research?: ResearchOutput
  sections: Record<string, string | string[]>
  links?: Record<string, SlotLink[]>
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

// path built locally to avoid a cycle with progress.ts
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
  const doc = JSON.parse(raw) as DraftDoc

  // drop `done` entries for stages that no longer exist (removing `deep` left drafts reading '5 of 4')
  doc.done = doc.done.filter((id) => (STAGE_IDS as readonly string[]).includes(id))
  return doc
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
      // a sidecar can vanish between readdir and read (publish deletes it); omit it
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

// slots that don't depend on research: the front stage's eight plus one local section per template service.
// Invariant: equals requiredSlotsFor(undefined).
export const REQUIRED_SLOTS = [
  'services.heroParagraphs',
  'services.serviceIntro',
  'services.cards.dusting',
  'services.cards.vacuuming',
  'services.cards.bathroom',
  'services.cards.window',
  'services.cards.upholstery',
  ...SERVICE_LOCAL_SLUGS.flatMap((slug) => serviceSlots(slug)),
] as const

// REQUIRED_SLOTS plus three per researched area; the union of stageSlots(research) across stages
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

// status/domain of the existing document, carried forward so re-finalizing a live city can't demote it
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
    // isWrittenSlot, not `!== undefined`: a model can return ""
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
    // placeholder when the form left the address blank; validate refuses it on a live city
    address: facts.address ?? `${facts.city} — address pending`,
    // carried from the previous document: a finalize never publishes or un-publishes
    status: published?.status ?? 'draft',
    // every finalized draft gets area pages once research.suburbs exists
    hasSuburbPages: true,
    maps: { front: null, home: null, contact: null },
    research: {
      suburbs: research.suburbs,
      // ops.zips (operator decision) wins; research.zips stays the fallback (Minneapolis has never filled the field)
      zips: facts.ops?.zips?.length ? facts.ops.zips : research.zips,
      conditions: research.conditions,
      mapEmbedUrl: null,
    },
    sections,
  }
  // only links whose slot made it into the document
  const links: Record<string, SlotLink[]> = {}
  for (const [slot, list] of Object.entries(draft.links ?? {})) {
    if (slot in sections && list.length > 0) links[slot] = list
  }
  if (Object.keys(links).length > 0) doc.links = links
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

// Draft -> live. `opts.domain` maps a host the operator owns; `opts.provisionDomain` buys one (opt-in, spends money).
export async function publishCity(
  key: string,
  opts: { domain?: string; provisionDomain?: boolean } = {},
  log: (msg: string) => void = () => {},
): Promise<void> {
  assertKeyShape(key)
  const raw = await readFile(cityPath(key), 'utf-8')
  const doc = validateCityContent(JSON.parse(raw))

  // duplication is refused at publish, not finalize, and only against live cities
  // invisible characters first: a zero-width space defeats the duplication check
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

  // quality last; only blocking findings refuse
  const quality = checkQuality(doc).filter((f) => f.blocking)
  if (quality.length > 0) {
    const lines = quality.map((f) => `  ${f.slot}: ${f.detail}`)
    throw new Error(
      `cannot publish "${key}": ${quality.length} quality finding(s)\n${lines.join('\n')}`,
    )
  }

  doc.status = 'live'

  let host: string | undefined
  if (opts.provisionDomain) {
    // buys, attaches, routes, then returns; the admin polls for DNS/TLS
    const { registrar, host: hostClient, router } = buildProvisioners()
    const result = await provisionDomain(
      { cityKey: key, city: doc.city, state: doc.state },
      registrar,
      hostClient,
      router,
      log,
    )
    host = result.domain
    doc.domain = host
    if (result.live) delete doc.provisioning
    else doc.provisioning = { since: new Date().toISOString(), domain: result.domain }
  } else if (opts.domain !== undefined) {
    host = opts.domain.toLowerCase().split(':')[0]
    doc.domain = host
  }

  await writeFile(cityPath(key), JSON.stringify(doc, null, 2), 'utf-8')

  if (host !== undefined) {
    const domains = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as DomainsIndex
    // retire the old domain when re-publishing with a new one; only entries pointing at THIS key
    for (const [existingHost, mappedKey] of Object.entries(domains.hosts)) {
      if (mappedKey === key && existingHost !== host) delete domains.hosts[existingHost]
    }
    domains.hosts[host] = key
    await writeFile(DOMAINS_JSON, JSON.stringify(domains, null, 2), 'utf-8')

    // and into Global Config when configured; _domains.json stays the fallback
    const router = buildRouter()
    if (router) {
      await router.setHost(host, key)
      await router.addCityKey(key)
    }
  }

  revalidateCity(key)
  await rm(draftPath(key), { force: true })
  await rm(progressPath(key), { force: true })
}
